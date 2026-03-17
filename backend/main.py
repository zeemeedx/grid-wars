from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from pydantic import BaseModel
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@db:5432/gridwars")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Entities
class Player(Base):
    __tablename__ = "players"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    coins = Column(Integer, default=0)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="GridWars API", version="1.0")

# DTOs
class PlayerCreate(BaseModel):
    name: str
    coins: int = 0

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# CRUD Routes
@app.get("/healthcheck", status_code=status.HTTP_200_OK)
def healthcheck():
    return {
        "status": "ok",
        "message": "API is working."
    }

@app.get("/")
def read_root():
    return {
        "message": "Welcome to GridWars! Go to /docs to read the API documentation."
    }

@app.post("/players/", response_model=PlayerCreate)
def create_player(player: PlayerCreate, db: Session = Depends(get_db)):
    db_player = Player(name=player.name, coins=player.coins)
    db.add(db_player)
    db.commit()
    db.refresh(db_player)
    return db_player

@app.get("/players/{player_id}")
def read_player(player_id: int, db: Session = Depends(get_db)):
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player

@app.put("/players/{player_id}")
def update_player(player_id: int, coins: int, db: Session = Depends(get_db)):
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")    
    player.coins = coins
    db.commit()
    db.refresh(player)
    return player

@app.delete("/players/{player_id}")
def delete_player(player_id: int, db: Session = Depends(get_db)):
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")  
    db.delete(player)
    db.commit()
    return {"message": "Player deleted"}