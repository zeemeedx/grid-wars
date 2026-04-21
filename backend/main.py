from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy import create_engine, Column, Integer, String, JSON, ForeignKey, Table
from sqlalchemy.orm import sessionmaker, Session, declarative_base, relationship
from pydantic import BaseModel
import bcrypt
from jose import JWTError, jwt
from datetime import datetime, timedelta
import os

# Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@db:5432/gridwars")
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here") # Change in production
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Association table for completed maps
completed_maps = Table(
    "completed_maps",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("map_id", Integer, ForeignKey("maps.id"), primary_key=True)
)

# Entities
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    coins = Column(Integer, default=0)
    maps = relationship("GameMap", back_populates="owner")
    finished_maps = relationship("GameMap", secondary=completed_maps)

class GameMap(Base):
    __tablename__ = "maps"
    id = Column(Integer, primary_key=True, index=True)
    grid = Column(JSON)
    price = Column(Integer, default=10)
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="maps")

Base.metadata.create_all(bind=engine)

app = FastAPI(title="GridWars API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# DTOs
class UserCreate(BaseModel):
    username: str
    password: str

class UserOut(BaseModel):
    id: int
    username: str
    coins: int
    class Config:
        orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str

class MapCreate(BaseModel):
    grid: list[int]
    price: int = 10

# Utils
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def verify_password(plain_password: str, hashed_password: str):
    return bcrypt.checkpw(plain_password.encode('utf-8')[:72], hashed_password.encode('utf-8'))

def get_password_hash(password: str):
    pwd_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

# Routes
@app.get("/", status_code=status.HTTP_200_OK)
def root():
    return {"message": "Welcome to GridWars! Go to /docs to read the API documentation."}

@app.get("/healthcheck", status_code=status.HTTP_200_OK)
def healthcheck():
    return {"status": "ok", "message": "API is working."}

@app.post("/register", response_model=UserOut)
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_pwd = get_password_hash(user.password)
    new_user = User(username=user.username, hashed_password=hashed_pwd)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=UserOut)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@app.put("/users/me/coins")
async def update_my_coins(coins: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    current_user.coins = coins
    db.commit()
    return {"coins": current_user.coins}

@app.post("/maps/{map_id}/complete")
async def complete_map(map_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    game_map = db.query(GameMap).filter(GameMap.id == map_id).first()
    if not game_map:
        raise HTTPException(status_code=404, detail="Map not found")
    if game_map not in current_user.finished_maps:
        current_user.finished_maps.append(game_map)
        db.commit()
    return {"message": "Map marked as completed"}

@app.get("/players/")
def read_all_players(db: Session = Depends(get_db)):
    return db.query(User).order_by(User.coins.desc()).all()

@app.post("/maps/")
def create_map(map_data: MapCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    safe_price = max(10, min(100, map_data.price))
    db_map = GameMap(grid=map_data.grid, price=safe_price, owner_id=current_user.id)
    db.add(db_map)
    db.commit()
    return {"message": "Map saved successfully"}

@app.get("/maps/")
def read_all_maps(owner_id: int | None = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(GameMap)
    if owner_id:
        query = query.filter(GameMap.owner_id == owner_id)
    
    maps = query.all()
    result = []
    for m in maps:
        is_completed = m in current_user.finished_maps
        result.append({
            "id": m.id,
            "grid": m.grid,
            "price": m.price,
            "owner_username": m.owner.username if m.owner else "Unknown",
            "owner_id": m.owner_id,
            "completed": is_completed
        })
    return result

@app.get("/maps/{map_id}")
def read_map(map_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    game_map = db.query(GameMap).filter(GameMap.id == map_id).first()
    if not game_map:
        raise HTTPException(status_code=404, detail="Map not found")
    is_completed = game_map in current_user.finished_maps
    return {
        "id": game_map.id,
        "grid": game_map.grid,
        "price": game_map.price,
        "owner_username": game_map.owner.username if game_map.owner else "Unknown",
        "owner_id": game_map.owner_id,
        "completed": is_completed
    }
