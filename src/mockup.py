import tkinter as tk

TAMANHO_BLOCO = 50
LINHAS = 10
COLUNAS = 10

MAPA = [
    ['P', '.', '.', '#', '.', '.', '.', '.', '.', '.'],
    ['.', '#', '.', '#', '.', '.', 'T', '.', '#', '.'],
    ['.', '#', '.', '.', '.', '#', '#', '.', '#', '.'],
    ['.', '.', '.', '#', '.', '.', '.', '.', '.', '.'],
    ['#', '#', '.', '#', '#', '#', '#', '#', '.', '#'],
    ['.', '.', '.', '.', '.', '.', '.', '.', '.', '.'], 
    ['.', '#', '#', '#', '#', '#', '#', '#', '#', '.'],
    ['.', '.', '.', '.', '.', 'T', '.', '.', '.', '.'],
    ['#', '#', '#', '#', '.', '#', '#', '#', '#', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.', '.', 'G']
]

patrulhas_iniciais = [{'l': 5, 'c': 1, 'dir': 1}] 

CORES = {
    '.': '#f5f5f5',   # Caminho livre
    '#': '#2d3436',   # Parede
    'T': '#e17055',   # Armadilha fixa
    'G': '#00b894'    # Chegada
}

class PathMaker(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("PathMaker - Protótipo Tático")
        self.canvas = tk.Canvas(self, width=COLUNAS * TAMANHO_BLOCO, height=LINHAS * TAMANHO_BLOCO)
        self.canvas.pack()
        
        self.lbl_status = tk.Label(self, text="Modo: PLANEJAMENTO | Setas: Desenhar | Espaço: Esperar | Enter: PLAY | Backspace: Apagar", font=("Arial", 10, "bold"))
        self.lbl_status.pack(pady=5)
        
        self.setup_jogo()
        self.bind("<Key>", self.tecla_pressionada)
        self.desenhar_tela()

    def setup_jogo(self):
        self.estado = "PLANEJANDO" 
        
        for l in range(LINHAS):
            for c in range(COLUNAS):
                if MAPA[l][c] == 'P':
                    self.start_l, self.start_c = l, c
        
        self.rota = [(self.start_l, self.start_c)]
        self.passo_atual = 0 
        self.patrulhas = [dict(p) for p in patrulhas_iniciais]

    def desenhar_tela(self):
        self.canvas.delete("all")
        
        for l in range(LINHAS):
            for c in range(COLUNAS):
                x1, y1 = c * TAMANHO_BLOCO, l * TAMANHO_BLOCO
                celula = MAPA[l][c]
                cor = CORES.get(celula if celula != 'P' else '.', 'white')
                self.canvas.create_rectangle(x1, y1, x1+TAMANHO_BLOCO, y1+TAMANHO_BLOCO, fill=cor, outline="#dfe6e9")

        if len(self.rota) > 1:
            pontos = [(c * TAMANHO_BLOCO + 25, l * TAMANHO_BLOCO + 25) for l, c in self.rota]
            self.canvas.create_line(pontos, fill="#fdcb6e", width=4, dash=(4, 2))
            
            for i in range(1, len(self.rota)):
                if self.rota[i] == self.rota[i-1]:
                    l, c = self.rota[i]
                    self.canvas.create_oval(c*TAMANHO_BLOCO+20, l*TAMANHO_BLOCO+20, c*TAMANHO_BLOCO+30, l*TAMANHO_BLOCO+30, fill="#fdcb6e")

        for p in self.patrulhas:
            x1, y1 = p['c'] * TAMANHO_BLOCO + 5, p['l'] * TAMANHO_BLOCO + 5
            self.canvas.create_rectangle(x1, y1, x1+40, y1+40, fill="#d63031")

        if self.estado == "PLANEJANDO":
            l, c = self.rota[-1]
            x1, y1 = c * TAMANHO_BLOCO + 10, l * TAMANHO_BLOCO + 10
            self.canvas.create_oval(x1, y1, x1+30, y1+30, fill="#74b9ff", outline="#0984e3", width=2)
            
            l, c = self.start_l, self.start_c
            x1, y1 = c * TAMANHO_BLOCO + 10, l * TAMANHO_BLOCO + 10
            self.canvas.create_oval(x1, y1, x1+30, y1+30, fill="#0984e3")
            
        elif self.estado in ["EXECUTANDO", "FIM"]:
            l, c = self.rota[self.passo_atual]
            x1, y1 = c * TAMANHO_BLOCO + 10, l * TAMANHO_BLOCO + 10
            self.canvas.create_oval(x1, y1, x1+30, y1+30, fill="#0984e3")

    def tecla_pressionada(self, event):
        if self.estado != "PLANEJANDO": return

        tecla = event.keysym.lower()
        ultimo_l, ultimo_c = self.rota[-1]
        novo_l, novo_c = ultimo_l, ultimo_c

        if tecla in ['w', 'up']: novo_l -= 1
        elif tecla in ['s', 'down']: novo_l += 1
        elif tecla in ['a', 'left']: novo_c -= 1
        elif tecla in ['d', 'right']: novo_c += 1
        elif tecla == 'space': 
            self.rota.append((novo_l, novo_c))
            self.lbl_status.config(text=f"Passos planejados: {len(self.rota)-1} (ESPEROU)")
            self.desenhar_tela()
            return
        elif tecla == 'backspace':
            if len(self.rota) > 1:
                self.rota.pop()
                self.lbl_status.config(text=f"Passos planejados: {len(self.rota)-1}")
                self.desenhar_tela()
            return
        elif tecla == 'return':
            self.estado = "EXECUTANDO"
            self.lbl_status.config(text="Modo: EXECUTANDO ROTA...", fg="blue")
            self.executar_passo()
            return
        else: return

        if 0 <= novo_l < LINHAS and 0 <= novo_c < COLUNAS:
            if MAPA[novo_l][novo_c] != '#':
                self.rota.append((novo_l, novo_c))
                self.lbl_status.config(text=f"Passos planejados: {len(self.rota)-1}")
        
        self.desenhar_tela()

    def executar_passo(self):
        if self.estado != "EXECUTANDO": return

        for p in self.patrulhas:
            prox_c = p['c'] + p['dir']
            if prox_c < 0 or prox_c >= COLUNAS or MAPA[p['l']][prox_c] == '#':
                p['dir'] *= -1
                prox_c = p['c'] + p['dir']
            p['c'] = prox_c

        if self.passo_atual < len(self.rota) - 1:
            self.passo_atual += 1

        jogador_l, jogador_c = self.rota[self.passo_atual]

        morreu = False
        
        if MAPA[jogador_l][jogador_c] == 'T': morreu = True
        
        for p in self.patrulhas:
            if p['l'] == jogador_l and p['c'] == jogador_c: morreu = True
            
        if morreu:
            self.estado = "FIM"
            self.lbl_status.config(text="FALHOU! Você morreu na armadilha. Aperte 'R' para reiniciar.", fg="red")
            self.bind("<Key-r>", lambda e: self.reiniciar())
            self.desenhar_tela()
            return

        if MAPA[jogador_l][jogador_c] == 'G':
            self.estado = "FIM"
            self.lbl_status.config(text=f"VITÓRIA! Rota concluída em {self.passo_atual} turnos!", fg="green")
            self.desenhar_tela()
            return

        self.desenhar_tela()
        if self.passo_atual < len(self.rota) - 1:
            self.after(400, self.executar_passo)
        else:
            self.estado = "FIM"
            self.lbl_status.config(text="FALHOU! A rota acabou e você não chegou no verde. Aperte 'R'.", fg="red")
            self.bind("<Key-r>", lambda e: self.reiniciar())

    def reiniciar(self):
        self.unbind("<Key-r>")
        self.lbl_status.config(text="Modo: PLANEJAMENTO | Setas: Desenhar | Espaço: Esperar | Enter: PLAY", fg="black")
        self.setup_jogo()
        self.desenhar_tela()

if __name__ == "__main__":
    app = PathMaker()
    app.mainloop()