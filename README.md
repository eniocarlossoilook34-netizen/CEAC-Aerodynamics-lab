# ✈️ CEAC-Aerodynamics-Lab

Simulador interativo de escoamento de fluidos ao redor de um perfil NACA 0012, integrando um motor de cálculo em Python com visualização 3D em tempo real.

## 🚀 Tecnologias e Física Aplicada
Este projeto é um **Solver Híbrido** desenvolvido para o CEAC-Lab:

* **Backend (Python/FastAPI):** Resolve o **Vortex Panel Method** (Método de Painéis de Vórtice) utilizando matrizes do NumPy para calcular a circulação e o Coeficiente de Sustentação ($C_L$).
* **Frontend (Three.js/WebGL):** Renderiza o campo de vetores através de superposição linear, criando *streamlines* dinâmicas com suavização de singularidade.
* **Engenharia:** Telemetria de Número de Reynolds em tempo real e monitoramento de Ângulo de Ataque com alerta de Estol (Stall).

## 🛠️ Como rodar
1. Instale as dependências: `pip install fastapi uvicorn numpy`
2. Inicie o servidor: `python main.py`
3. Abra o `index.html` no seu navegador.# 🛠️ Ferramentas de Engenharia com Python




