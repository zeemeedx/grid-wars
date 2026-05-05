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
  const [grade, setGrade] = useState(Array(100).fill(0).map((v, i) => i === 99 ? -2 : v));
  const [itemSelecionado, setItemSelecionado] = useState(1); 
  const [borrachaSelecionada, setBorrachaSelecionada] = useState(false);
  const [planejarTrajeto, setPlanejarTrajeto] = useState(false);
  const [playerPos, setPlayerPos] = useState(0);
  const [rotaPlanejada, setRotaPlanejada] = useState([0]);
  const [mostrarVitoria, setMostrarVitoria] = useState(false);
  const [executando, setExecutando] = useState(false); // Novo estado para animação
  
  const gridLayout = useRef({ x: 0, y: 0 });
  const stateRef = useRef({ grade, itemSelecionado, borrachaSelecionada, planejarTrajeto, executando });
  stateRef.current = { grade, itemSelecionado, borrachaSelecionada, planejarTrajeto, executando };

  const handleLogin = async () => {
    try {
      // FastAPI OAuth2 expects application/x-www-form-urlencoded
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
      const msg = e.response ? `Erro ${e.response.status}: ${JSON.stringify(e.response.data.detail)}` : "Não foi possível conectar ao servidor. Verifique o IP e se o backend está rodando.";
      Alert.alert("Erro de Login", msg);
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
    let novaPos = playerPos;
    if (dir === 'W' && playerPos >= 10) novaPos -= 10;
    else if (dir === 'S' && playerPos <= 89) novaPos += 10;
    else if (dir === 'A' && playerPos % 10 !== 0) novaPos -= 1;
    else if (dir === 'D' && playerPos % 10 !== 9) novaPos += 1;
    
    if (grade[novaPos] === 1) return; // Parede bloqueia o traçado

    if (novaPos !== playerPos) {
      setPlayerPos(novaPos);
      setRotaPlanejada([...rotaPlanejada, novaPos]);
    }
  };

  // F1: Execução de Rotas (Animação)
  const iniciarExecucao = () => {
    if (rotaPlanejada.length <= 1) return;
    setExecutando(true);
    let passo = 0;
    
    const intervalo = setInterval(() => {
      if (passo < rotaPlanejada.length) {
        setPlayerPos(rotaPlanejada[passo]);
        passo++;
      } else {
        clearInterval(intervalo);
        setExecutando(false);
        if (rotaPlanejada[rotaPlanejada.length - 1] === 99) {
          setMostrarVitoria(true);
        }
      }
    }, 200); // Velocidade do movimento
  };

  const resetarTrajeto = () => {
    setPlayerPos(0);
    setRotaPlanejada([0]);
    setExecutando(false);
  };

  if (!user) {
    return (
      <View style={styles.loginContainer}>
        <Text style={styles.title}>GRIDWARS LOGIN</Text>
        <TextInput style={styles.input} placeholder="Usuário" onChangeText={setUsername} autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Senha" secureTextEntry onChangeText={setPassword} />
        <TouchableOpacity style={styles.btn} onPress={handleLogin}><Text style={{fontWeight: 'bold'}}>ENTRAR</Text></TouchableOpacity>
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
  inventory: { flexDirection: 'row', gap: 20, marginBottom: 30 },
  item: { width: 55, height: 55, borderWidth: 1, borderRadius: 4 },
  eraser: { backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' },
  selected: { borderColor: 'red', borderWidth: 4 },
  gridContainer: { width: GRID_SIZE, height: GRID_SIZE, backgroundColor: 'white', borderWidth: 2, borderColor: '#BBB', overflow: 'hidden' },
  gridOuter: { width: GRID_SIZE, height: GRID_SIZE, flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: CELL_SIZE, height: CELL_SIZE, borderWidth: 0.2, borderColor: '#BBB', justifyContent: 'center', alignItems: 'center' },
  type0: { backgroundColor: '#CCCCCC' }, 
  type1: { backgroundColor: '#222222' }, 
  type2: { backgroundColor: '#00008B' }, 
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