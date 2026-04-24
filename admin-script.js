import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCSrf2LUF40Oyrt0WMtJCYX-vN5STU5i2g",
    authDomain: "cardapioonline-9b4ec.firebaseapp.com",
    projectId: "cardapioonline-9b4ec",
    storageBucket: "cardapioonline-9b4ec.firebasestorage.app",
    messagingSenderId: "841899356791",
    appId: "1:841899356791:web:21cc4431664b1b84d9cc72"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let produtos = [];
let pedidos = [];
let totalPedidosAntigo = 0;

const form = document.getElementById('form-cadastro');
const tabela = document.getElementById('tabela-produtos'); 
const listaPedidos = document.getElementById('lista-pedidos-recebidos');
const somNotificacao = new Audio('https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3');

// --- ESCUTA PRODUTOS ---
onSnapshot(collection(db, "produtosCardapio"), (snapshot) => {
    produtos = [];
    snapshot.forEach(doc => produtos.push({ docId: doc.id, ...doc.data() }));
    renderizarProdutos();
});

// --- ESCUTA PEDIDOS (Restaurado com som e badge) ---
onSnapshot(collection(db, "pedidosRecebidos"), (snapshot) => {
    let novosPedidos = [];
    snapshot.forEach(doc => novosPedidos.push({ docId: doc.id, ...doc.data() }));
    
    // Toca som se houver novo pedido
    if (novosPedidos.length > totalPedidosAntigo && totalPedidosAntigo !== 0) {
        somNotificacao.play().catch(() => {});
    }
    
    pedidos = novosPedidos;
    totalPedidosAntigo = pedidos.length;
    renderizarPedidos();
});

window.alternarTela = function(tela) {
    document.getElementById('tela-produtos').style.display = tela === 'produtos' ? 'block' : 'none';
    document.getElementById('tela-pedidos').style.display = tela === 'pedidos' ? 'block' : 'none';
    
    if (tela === 'pedidos') renderizarPedidos();
    else renderizarProdutos();

    document.querySelectorAll('.btn-nav').forEach(btn => btn.classList.remove('active'));
    if (event && event.currentTarget) event.currentTarget.classList.add('active');
}

// --- RENDERIZAÇÃO RESTAURADA CONFORME IMAGEM ---
function renderizarPedidos() {
    if (!listaPedidos) return;
    
    if (pedidos.length === 0) {
        listaPedidos.innerHTML = '<p style="text-align:center; padding:40px; color:#94a3b8;">Aguardando pedidos...</p>';
        return;
    }

    // Ordena do mais novo para o mais antigo
    listaPedidos.innerHTML = [...pedidos].sort((a,b) => b.id - a.id).map((ped) => {
        const pendente = ped.status === 'pendente';
        const statusTexto = pendente ? `🚨 NOVO PEDIDO - ${ped.cliente}` : `✅ FINALIZADO - ${ped.cliente}`;
        
        return `
        <div class="pedido-card ${pendente ? 'pedido-novo' : ''}" style="border-left: 4px solid ${pendente ? '#ef4444' : '#10b981'};">
            <div class="pedido-info">
                <h4 style="color: ${pendente ? '#ef4444' : '#10b981'}; margin: 0; font-size: 0.9rem; text-transform: uppercase;">
                    ${statusTexto}
                </h4>
                <div style="margin: 5px 0; font-size: 0.8rem; color: #94a3b8;">
                    📱 ${ped.telefone || 'Sem fone'} | 🕒 ${ped.hora}
                </div>
                <p style="margin: 8px 0; color: #f1f5f9; font-size: 1rem;">
                    ${ped.itens.map(i => i.nome).join(', ')}
                </p>
                <div style="color: #10b981; font-weight: 800; font-size: 1.1rem;">
                    Total: R$ ${parseFloat(ped.total).toFixed(2)}
                </div>
            </div>

            <div class="acoes-pedidos">
                <button class="btn-imprimir" onclick="imprimirPedido('${ped.docId}')" style="background: white; color: black; border: 1px solid #ccc;">🖨️ Imprimir Cupom</button>
                
                ${pendente ? 
                    `<button class="btn-concluir" onclick="concluirPedido('${ped.docId}')" style="background: #10b981; color: white;">✅ Concluir</button>` : 
                    `<button class="btn-avisar" onclick="avisarCliente('${ped.docId}')" style="background: #3b82f6; color: white;">📲 Avisar Cliente</button>`
                }
                
                <button class="btn-remover" onclick="removerPedidoApenas('${ped.docId}')" style="background: white; color: black; border: 1px solid #ccc;">🗑️ Remover do Histórico</button>
            </div>
        </div>`;
    }).join('');
    
    atualizarBadge();
}

// --- FUNÇÕES DE AÇÃO (FIREBASE) ---
window.concluirPedido = async (docId) => {
    await updateDoc(doc(db, "pedidosRecebidos", docId), { status: 'concluido' });
}

window.removerPedidoApenas = async (docId) => {
    if(confirm("Deseja remover este pedido do histórico?")) {
        await deleteDoc(doc(db, "pedidosRecebidos", docId));
    }
}

window.avisarCliente = function(docId) {
    const ped = pedidos.find(p => p.docId === docId);
    if (!ped.telefone) return alert("Sem telefone!");
    const msg = `Olá ${ped.cliente}, seu pedido #${ped.numero || ''} está pronto e já saiu!`; // Mensagem restaurada
    window.open(`https://api.whatsapp.com/send?phone=55${ped.telefone.replace(/\D/g, '')}&text=${encodeURIComponent(msg)}`);
}

// --- IMPRESSÃO TÉRMICA RESTAURADA ---
window.imprimirPedido = function(docId) {
    const ped = pedidos.find(p => p.docId === docId);
    if (!ped) return;
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    const docPrint = iframe.contentWindow.document;
    
    docPrint.write(`
        <html>
            <head>
                <style>
                    body { font-family: 'Courier New', monospace; width: 80mm; padding: 5px; font-size: 11pt; }
                    .center { text-align: center; }
                    .line { border-bottom: 1px dashed #000; margin: 8px 0; }
                    .numero-pedido { font-size: 40pt; font-weight: bold; margin: 10px 0; border: 2px solid #000; display: inline-block; padding: 5px 15px; }
                </style>
            </head>
            <body>
                <div class="center">
                    <h2 style="margin:0">BURGUER MANIA</h2>
                    <div class="numero-pedido">#${ped.numero || ped.id.toString().slice(-4)}</div>
                    <p>${ped.hora}</p>
                </div>
                <div class="line"></div>
                <p><b>CLIENTE:</b> ${ped.cliente}</p>
                <p><b>FONE:</b> ${ped.telefone || 'N/I'}</p>
                <p><b>TIPO:</b> ${ped.tipo.toUpperCase()}</p>
                ${ped.tipo === 'entrega' ? `<p><b>ENDEREÇO:</b> ${ped.endereco}</p>` : ''}
                <div class="line"></div>
                ${ped.itens.map(i => `<div>${i.nome} - R$ ${parseFloat(i.preco).toFixed(2)}</div>`).join('')}
                <div class="line"></div>
                <h2 style="text-align:right">TOTAL: R$ ${parseFloat(ped.total).toFixed(2)}</h2>
                <div class="center"><p>*** Obrigado pela preferência ***</p></div>
            </body>
        </html>
    `);
    docPrint.close();
    iframe.contentWindow.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
}

// --- GESTÃO DE PRODUTOS ---
function renderizarProdutos() {
    if (!tabela) return;
    tabela.innerHTML = produtos.map((p) => `
        <div class="card-produto">
            <div class="info-corpo-card">
                <span class="categoria">${p.categoria}</span>
                <h3>${p.nome}</h3>
                <p class="preco">R$ ${parseFloat(p.preco).toFixed(2)}</p>
            </div>
            <div class="acoes-card-prod">
                <button onclick="removerProduto('${p.docId}')">❌ Excluir</button>
            </div>
        </div>
    `).join('');
}

window.removerProduto = async (docId) => {
    if(confirm("Remover do cardápio online?")) {
        await deleteDoc(doc(db, "produtosCardapio", docId));
    }
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const novoProd = {
        id: Date.now(),
        nome: document.getElementById('prod-nome').value,
        categoria: document.getElementById('prod-categoria').value,
        preco: parseFloat(document.getElementById('prod-preco').value),
        desc: document.getElementById('prod-desc').value
    };
    await addDoc(collection(db, "produtosCardapio"), novoProd);
    form.reset();
});

function atualizarBadge() {
    const badge = document.getElementById('badge-pedidos');
    const novos = pedidos.filter(p => p.status === 'pendente').length;
    if(badge) {
        badge.innerText = novos || "";
        badge.style.display = novos > 0 ? "inline-block" : "none";
    }
}