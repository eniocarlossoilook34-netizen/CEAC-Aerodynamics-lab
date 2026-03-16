import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

let scene, camera, renderer, cube, velocityArrow, particles;
let vortexStrengths = [];
const particleCount = 400; 
const particleData = [];
const simConfig = { velocity: 10, aoa: 0, viscosity: 0.000015 };

let performanceChart;
const chartData = {
    labels: [],
    datasets: [{
        label: 'Cl',
        data: [],
        borderColor: '#58a6ff',
        backgroundColor: 'rgba(88, 166, 255, 0.1)',
        borderWidth: 2,
        tension: 0.3,
        fill: true
    }]
};

function init3D() {
    scene = new THREE.Scene();
    const bgGeo = new THREE.SphereGeometry(100, 32, 32);
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x05070a, side: THREE.BackSide });
    scene.add(new THREE.Mesh(bgGeo, bgMat));

    camera = new THREE.PerspectiveCamera(75, 400 / 250, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(400, 250);
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // Geometria NACA 0012
    const points = [];
    const t = 0.12; 
    for (let i = 0; i <= 60; i++) {
        let x = i / 60;
        let yt = 5 * t * (0.2969 * Math.sqrt(x) - 0.1260 * x - 0.3516 * x**2 + 0.2843 * x**3 - 0.1015 * x**4);
        points.push(new THREE.Vector2(x * 2 - 1, yt));
    }
    for (let i = 60; i >= 0; i--) {
        let x = i / 60;
        let yt = 5 * t * (0.2969 * Math.sqrt(x) - 0.1260 * x - 0.3516 * x**2 + 0.2843 * x**3 - 0.1015 * x**4);
        points.push(new THREE.Vector2(x * 2 - 1, -yt));
    }

    const shape = new THREE.Shape(points);
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 1.5, bevelEnabled: false });
    geometry.center();
    geometry.rotateY(Math.PI / 2);

    const material = new THREE.MeshStandardMaterial({ 
        color: 0x58a6ff, metalness: 0.6,
        roughness: 0.2,
        transparent: true,
        opacity: 0.9,
        emissive: 0x112244 
    });
    cube = new THREE.Mesh(geometry, material);
    
    const wire = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), new THREE.LineBasicMaterial({color: 0xffffff, opacity: 0.2, transparent: true}));
    cube.add(wire);
    scene.add(cube);

    scene.add(new THREE.DirectionalLight(0xffffff, 1.5).position.set(5,5,5));
    scene.add(new THREE.AmbientLight(0x404040));
    camera.position.set(0, 0.5, 3.5);
}

function initStreamlines() {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
        const x = Math.random() * 10 - 5;
        const y = Math.random() * 4 - 2;
        pos[i*3] = x; pos[i*3+1] = y; pos[i*3+2] = (Math.random()-0.5)*1.5;
        particleData.push({ oy: y });
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    particles = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.03, transparent: true, opacity: 0.5 }));
    scene.add(particles);
}

function updateSimulation() {
    simConfig.velocity = parseFloat(document.getElementById('velocity').value);
    simConfig.aoa = parseFloat(document.getElementById('aoa').value);
    document.getElementById('val-v').innerText = simConfig.velocity;
    document.getElementById('val-aoa').innerText = simConfig.aoa;
    if (cube) cube.rotation.x = (simConfig.aoa * Math.PI) / 180;

    if (simConfig.aoa > 15) logStatus("<span style='color:#ff4757'>⚠️ ALERTA: Estol iminente!</span>");
}

function logStatus(msg) {
    document.getElementById('status-display').innerHTML = `[${new Date().toLocaleTimeString()}] ${msg}`;
}

// Botão Executar
document.getElementById('run-simulation').addEventListener('click', async () => {
    logStatus("Calculando Matriz de Influência...");
    try {
        const res = await fetch('http://127.0.0.1:8000/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(simConfig)
        });
        const data = await res.json();
        vortexStrengths = data.gammas;
        document.getElementById('stat-re').innerText = data.reynolds;
        document.getElementById('stat-cl').innerText = data.cl;
        chartData.labels.push(`${simConfig.aoa}°`);
        chartData.datasets[0].data.push(data.cl);
        performanceChart.update();
        logStatus("Simulação CFD Concluída.");
    } catch (e) { logStatus("Erro: Backend Offline."); }
});

// Botão Reiniciar
document.getElementById('reset-data').addEventListener('click', () => {
    vortexStrengths = [];
    chartData.labels = [];
    chartData.datasets[0].data = [];
    performanceChart.update();
    document.getElementById('stat-re').innerText = "0";
    document.getElementById('stat-cl').innerText = "0.00";
    logStatus("Painel Reiniciado.");
});

function animate() {
    requestAnimationFrame(animate);
    if (particles) {
        const pos = particles.geometry.attributes.position.array;
        const vx_inf = simConfig.velocity * 0.003;
        const alpha = (simConfig.aoa * Math.PI) / 180;

        for (let i = 0; i < particleCount; i++) {
            let v_ind_x = 0, v_ind_y = 0;
            if (vortexStrengths.length > 0) {
                vortexStrengths.forEach((g, idx) => {
                    let xp = -1 + (idx * (2/vortexStrengths.length));
                    let dx = pos[i*3] - xp, dy = pos[i*3+1] - (xp * Math.tan(alpha));
                    let rSq = dx*dx + dy*dy + 0.8;
                    v_ind_x += (g * dy) / (6.28 * rSq);
                    v_ind_y -= (g * dx) / (6.28 * rSq);
                });
            }
            pos[i*3] += vx_inf + v_ind_x;
            pos[i*3+1] += v_ind_y;
            if (pos[i*3] > 5) { pos[i*3] = -5; pos[i*3+1] = particleData[i].oy; }
        }
        particles.geometry.attributes.position.needsUpdate = true;
    }
    renderer.render(scene, camera);
}

// Start
document.getElementById('velocity').addEventListener('input', updateSimulation);
document.getElementById('aoa').addEventListener('input', updateSimulation);
init3D();
const ctx = document.getElementById('performanceChart').getContext('2d');
performanceChart = new Chart(ctx, { type: 'line', data: chartData, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } });
initStreamlines();
animate();