import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, Modal, PanResponder, Dimensions } from 'react-native';
import axios from 'axios';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_SIZE = Math.floor(SCREEN_WIDTH * 0.9 / 10) * 10; 
const CELL_SIZE = GRID_SIZE / 10; 
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'; 

export default function App() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true); // Toggle entre Login e Cadastro
  const [grade, setGrade] = useState(Array(100).fill(0).map((v, i) => i === 99 ? -2 : v));
  const [itemSelecionado, setItemSelecionado] = useState(1); 
  const [borrachaSelecionada, setBorrachaSelecionada] = useState(false);
  const [planejarTrajeto, setPlanejarTrajeto] = useState(false);
  const [playerPos, setPlayerPos] = useState(0);
  const [rotaPlanejada, setRotaPlanejada] = useState([0]);
  const [mostrarVitoria, setMostrarVitoria] = useState(false);
  const [executando, setExecutando] = useState(false); 
  
  const gridLayout = useRef({ x: 0, y: 0 });
  const stateRef = useRef({ grade, itemSelecionado, borrachaSelecionada, planejarTrajeto, executando });
  stateRef.current = { grade, itemSelecionado, borrachaSelecionada, planejarTrajeto, executando };

  const handleLogin = async () => {
    try {
      const data = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
      const res = await axios.post(`${API_BASE_URL}/token`, data, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      const userRes = await axios.get(`${API_BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${res.data.access_token}` }
      });
      setUser(userRes.data);
    } catch (e) {
      console.log("Erro de Login:", e);
      const msg = e.response?.data?.detail || "Não foi possível conectar ao servidor.";
      Alert.alert("Erro de Login", JSON.stringify(msg));
    }
  };

  const handleRegister = async () => {
    try {
      await axios.post(`${API_BASE_URL}/register`, { username, password });
      Alert.alert("Sucesso", "Conta criada com sucesso! Agora você pode entrar.");
      setIsLogin(true); // Volta para a tela de login
    } catch (e) {
      console.log("Erro de Cadastro:", e);
      const msg = e.response?.data?.detail || "Erro ao tentar criar conta.";
      Alert.alert("Erro de Cadastro", JSON.stringify(msg));
    }
  };

  const pintar = (index) => {
    const { grade: currentGrade, itemSelecionado: currentItem, borrachaSelecionada: isEraser, planejarTrajeto: isPlaying, executando: isAnim } = stateRef.current;
    if (index < 0 || index > 99 || index === 0 || index === 99 || isPlaying || isAnim) return;
    const novaGrade = [...currentGrade];
    const novoValor = isEraser ? 0 : currentItem;
    if (novaGrade[index] !== novoValor) {
      novaGrade[index] = novoValor;
      setGrade(novaGrade);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { pageX, pageY } = evt.nativeEvent;
        const touchX = pageX - gridLayout.current.x;
        const touchY = pageY - gridLayout.current.y;
        const index = Math.floor(touchY / CELL_SIZE) * 10 + Math.floor(touchX / CELL_SIZE);
        pintar(index);
      },
      onPanResponderMove: (evt) => {
        const { pageX, pageY } = evt.nativeEvent;
        const touchX = pageX - gridLayout.current.x;
        const touchY = pageY - gridLayout.current.y;
        const col = Math.floor(touchX / CELL_SIZE);
        const row = Math.floor(touchY / CELL_SIZE);
        if (col >= 0 && col < 10 && row >= 0 && row < 10) {
          pintar(row * 10 + col);
        }
      },
    })
  ).current;

  const moverNoPlanejamento = (dir) => {
    if (executando) return;
    
    const canMove = (pos, d) => {
      if (d === 'W' && pos < 10) return false;
      if (d === 'S' && pos >= 90) return false;
      if (d === 'A' && pos % 10 === 0) return false;
      if (d === 'D' && pos % 10 === 9) return false;
      
      let nextPos = pos;
      if (d === 'W') nextPos -= 10;
      else if (d === 'S') nextPos += 10;
      else if (d === 'A') nextPos -= 1;
      else if (d === 'D') nextPos += 1;
      
      return grade[nextPos] !== 1;
    };

    if (canMove(playerPos, dir)) {
      let novaPos = playerPos;
      if (dir === 'W') novaPos -= 10;
      else if (dir === 'S') novaPos += 10;
      else if (dir === 'A') novaPos -= 1;
      else if (dir === 'D') novaPos += 1;

      let novasPosicoes = [...rotaPlanejada, novaPos];
      let currentPos = novaPos;

      // Lógica de deslize no Gelo (ID 2)
      while (grade[currentPos] === 2 && canMove(currentPos, dir)) {
        if (dir === 'W') currentPos -= 10;
        else if (dir === 'S') currentPos += 10;
        else if (dir === 'A') currentPos -= 1;
        else if (dir === 'D') currentPos += 1;
        novasPosicoes.push(currentPos);
      }

      setPlayerPos(currentPos);
      setRotaPlanejada(novasPosicoes);
    }
  };

  const iniciarExecucao = () => {
    if (rotaPlanejada.length <= 1) return;
    setExecutando(true);
    let passo = 0;
    
    // Preparar estado inicial da execução
    const gridBase = [...grade];
    const inimigosAtivos = [];
    gridBase.forEach((tipo, index) => {
      if (tipo === 3 || tipo === 4) {
        inimigosAtivos.push({ pos: index, dir: 1, type: tipo });
        gridBase[index] = 0; // Limpa o inimigo do grid base para ele "flutuar"
      }
    });

    const intervalo = setInterval(() => {
      if (passo < rotaPlanejada.length) {
        const playerCurrentPos = rotaPlanejada[passo];
        setPlayerPos(playerCurrentPos);

        // Mover inimigos
        inimigosAtivos.forEach(enemy => {
          const isHorizontal = enemy.type === 3;
          const step = isHorizontal ? 1 : 10;
          
          const checkCollision = (pos, d) => {
            if (isHorizontal) {
              if (d === 1 && pos % 10 === 9) return true;
              if (d === -1 && pos % 10 === 0) return true;
            } else {
              if (d === 1 && pos >= 90) return true;
              if (d === -1 && pos < 10) return true;
            }
            return gridBase[pos + (step * d)] === 1; // Colisão com Parede (ID 1)
          };

          if (checkCollision(enemy.pos, enemy.dir)) {
            enemy.dir *= -1; // Inverte direção
          }
          
          if (!checkCollision(enemy.pos, enemy.dir)) {
            enemy.pos += (step * enemy.dir);
          }
        });

        // Atualizar visual da grade com novas posições dos inimigos
        const novaGradeVisual = [...gridBase];
        inimigosAtivos.forEach(e => {
          novaGradeVisual[e.pos] = e.type;
        });
        setGrade(novaGradeVisual);

        // Verificar colisão Jogador vs Inimigo
        if (inimigosAtivos.some(e => e.pos === playerCurrentPos)) {
          clearInterval(intervalo);
          setExecutando(false);
          Alert.alert("Game Over", "Você foi atingido por um inimigo!");
          setGrade([...stateRef.current.grade]); // Restaura grade original (com inimigos nos lugares iniciais)
          resetarTrajeto();
          return;
        }

        passo++;
      } else {
        clearInterval(intervalo);
        setExecutando(false);
        if (rotaPlanejada[rotaPlanejada.length - 1] === 99) {
          setMostrarVitoria(true);
        }
      }
    }, 200); 
  };

  const resetarTrajeto = () => {
    setPlayerPos(0);
    setRotaPlanejada([0]);
    setExecutando(false);
  };

  if (!user) {
    return (
      <View style={styles.loginContainer}>
        <Text style={styles.title}>{isLogin ? "GRIDWARS LOGIN" : "CRIAR CONTA"}</Text>
        <TextInput style={styles.input} placeholder="Usuário" onChangeText={setUsername} autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Senha" secureTextEntry onChangeText={setPassword} />
        
        <TouchableOpacity style={styles.btn} onPress={isLogin ? handleLogin : handleRegister}>
          <Text style={{fontWeight: 'bold'}}>{isLogin ? "ENTRAR" : "CADASTRAR"}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={{marginTop: 20}}>
          <Text style={{color: 'blue', textDecorationLine: 'underline'}}>
            {isLogin ? "Não tem conta? Crie uma agora" : "Já tem conta? Faça login"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.inventory}>
        <TouchableOpacity 
          style={[styles.item, styles.type1, (itemSelecionado === 1 && !borrachaSelecionada) && styles.selected]} 
          onPress={() => {setItemSelecionado(1); setBorrachaSelecionada(false);}}
        />
        <TouchableOpacity 
          style={[styles.item, styles.type2, (itemSelecionado === 2 && !borrachaSelecionada) && styles.selected]} 
          onPress={() => {setItemSelecionado(2); setBorrachaSelecionada(false);}}
        />
        <TouchableOpacity 
          style={[styles.item, styles.type3, (itemSelecionado === 3 && !borrachaSelecionada) && styles.selected]} 
          onPress={() => {setItemSelecionado(3); setBorrachaSelecionada(false);}}
        >
          <Text style={{fontSize: 20}}>↔️</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.item, styles.type4, (itemSelecionado === 4 && !borrachaSelecionada) && styles.selected]} 
          onPress={() => {setItemSelecionado(4); setBorrachaSelecionada(false);}}
        >
          <Text style={{fontSize: 20}}>↕️</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.item, styles.eraser, borrachaSelecionada && styles.selected]} 
          onPress={() => {setBorrachaSelecionada(true); setItemSelecionado(null);}}
        >
          <Text style={{fontSize: 24}}>🗑️</Text>
        </TouchableOpacity>
      </View>

      <View 
        style={styles.gridContainer}
        onLayout={(event) => {
          event.target.measure((x, y, width, height, pageX, pageY) => {
            gridLayout.current = { x: pageX, y: pageY };
          });
        }}
      >
        <View style={styles.gridOuter} {...panResponder.panHandlers}>
          {grade.map((item, index) => (
            <View key={index} style={[styles.cell, styles[`type${item}`], index === 99 && styles.goalCell]}>
              {rotaPlanejada.includes(index) && index !== playerPos && <View style={styles.dot} />}
              {index === playerPos && <View style={styles.playerNode} />}
              {index === 99 && !rotaPlanejada.includes(99) && <Text style={{fontSize: 12}}>🏁</Text>}
              {item === 3 && <Text style={{fontSize: 20}}>↔️</Text>}
              {item === 4 && <Text style={{fontSize: 20}}>↕️</Text>}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity 
          style={[styles.actionBtn, planejarTrajeto && {backgroundColor: '#ddd'}]} 
          onPress={() => {setPlanejarTrajeto(!planejarTrajeto); if(planejarTrajeto) resetarTrajeto();}}
        >
          <Text style={{fontWeight: 'bold'}}>{planejarTrajeto ? "CANCELAR PLANO" : "PLANEJAR TRAJETO (✏️)"}</Text>
        </TouchableOpacity>
        
        {planejarTrajeto && (
          <View style={{alignItems: 'center'}}>
            <View style={styles.dpad}>
              <TouchableOpacity style={styles.dBtn} onPress={() => moverNoPlanejamento('W')}><Text>▲</Text></TouchableOpacity>
              <View style={{flexDirection: 'row'}}>
                <TouchableOpacity style={styles.dBtn} onPress={() => moverNoPlanejamento('A')}><Text>◀</Text></TouchableOpacity>
                <TouchableOpacity style={styles.dBtn} onPress={() => moverNoPlanejamento('S')}><Text>▼</Text></TouchableOpacity>
                <TouchableOpacity style={styles.dBtn} onPress={() => moverNoPlanejamento('D')}><Text>▶</Text></TouchableOpacity>
              </View>
            </View>
            
            <TouchableOpacity 
              style={[styles.playBtn, executando && {opacity: 0.5}]} 
              onPress={iniciarExecucao}
              disabled={executando}
            >
              <Text style={styles.playText}>{executando ? "EXECUTANDO..." : "INICIAR MOVIMENTO ▶️"}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Modal visible={mostrarVitoria} transparent>
        <View style={styles.modal}>
          <Text style={styles.vitoriaText}>Objetivo Alcançado! 🏁</Text>
          <TouchableOpacity style={styles.btn} onPress={() => {setMostrarVitoria(false); resetarTrajeto(); setPlanejarTrajeto(false);}}>
            <Text style={{fontWeight: 'bold'}}>Reiniciar</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFEFD5', paddingTop: 60, alignItems: 'center' },
  loginContainer: { flex: 1, backgroundColor: '#FFEFD5', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  input: { width: '80%', height: 45, backgroundColor: 'white', borderWidth: 1, marginBottom: 10, padding: 10 },
  btn: { backgroundColor: '#ffdd55', padding: 15, borderRadius: 5, borderWidth: 1, minWidth: 150, alignItems: 'center' },
  toggleBtn: { backgroundColor: 'white', padding: 10, borderWidth: 1, borderRadius: 5, marginBottom: 10, minWidth: 200, alignItems: 'center' },
  inventory: { flexDirection: 'row', gap: 10, marginBottom: 30 },
  item: { width: 55, height: 55, borderWidth: 1, borderRadius: 4 },
  eraser: { backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' },
  selected: { borderColor: 'red', borderWidth: 4 },
  gridContainer: { width: GRID_SIZE, height: GRID_SIZE, backgroundColor: 'white', borderWidth: 2, borderColor: '#BBB', overflow: 'hidden' },
  gridOuter: { width: GRID_SIZE, height: GRID_SIZE, flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: CELL_SIZE, height: CELL_SIZE, borderWidth: 0.2, borderColor: '#BBB', justifyContent: 'center', alignItems: 'center' },
  type0: { backgroundColor: '#CCCCCC' }, 
  type1: { backgroundColor: '#222222' }, 
  type2: { backgroundColor: '#ADD8E6' }, 
  type3: { backgroundColor: '#FF0000', justifyContent: 'center', alignItems: 'center' }, 
  type4: { backgroundColor: '#FF0000', justifyContent: 'center', alignItems: 'center' }, 
  goalCell: { backgroundColor: '#28a745' }, 
  playerNode: { width: CELL_SIZE * 0.7, height: CELL_SIZE * 0.7, borderRadius: CELL_SIZE * 0.35, backgroundColor: '#008B8B', borderWidth: 1 }, 
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#87CEEB' }, 
  controls: { marginTop: 20, alignItems: 'center' },
  actionBtn: { backgroundColor: 'white', padding: 12, borderWidth: 2, borderRadius: 8, minWidth: 260, alignItems: 'center', marginBottom: 10 },
  playBtn: { backgroundColor: '#28a745', padding: 15, borderRadius: 8, marginTop: 15, minWidth: 200, alignItems: 'center' },
  playText: { color: 'white', fontWeight: 'bold' },
  dpad: { alignItems: 'center' },
  dBtn: { width: 55, height: 55, backgroundColor: 'white', borderWidth: 1, justifyContent: 'center', alignItems: 'center', margin: 1, borderRadius: 10 },
  modal: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.85)' },
  vitoriaText: { color: 'white', fontSize: 26, marginBottom: 20, fontWeight: 'bold' }
});