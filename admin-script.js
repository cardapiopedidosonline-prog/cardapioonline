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

// Elementos do DOM (Cadastro)
const form = document.getElementById('form-cadastro');
const tabela = document.getElementById('tabela-produtos'); 
const listaPedidos = document.getElementById('lista-pedidos-recebidos');
const somNotificacao = new Audio('https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3');

// Elementos do Modal de Edição (NOVO)
const modalEdicao = document.getElementById('modal-edicao');
const editDocId = document.getElementById('edit-docId');
const editNome = document.getElementById('edit-nome');
const editPreco = document.getElementById('edit-preco');
const editPromo = document.getElementById('edit-promo');

// --- ESCUTA PRODUTOS ---
onSnapshot(collection(db, "produtosCardapio"), (snapshot) => {
    produtos = [];
    snapshot.forEach(doc => produtos.push({ docId: doc.id, ...doc.data() }));
    renderizarProdutos();
});

// --- ESCUTA PEDIDOS ---
onSnapshot(collection(db, "pedidosRecebidos"), (snapshot) => {
    let novosPedidos = [];
    snapshot.forEach(doc => novosPedidos.push({ docId: doc.id, ...doc.data() }));
    if (novosPedidos.length > totalPedidosAntigo && totalPedidosAntigo !== 0) {
        somNotificacao.play().catch(() => {});
    }
    pedidos = novosPedidos;
    totalPedidosAntigo = pedidos.length;
    renderizarPedidos();
});

// Alternar Abas (Restaurado)
window.alternarTela = function(tela) {
    document.getElementById('tela-produtos').style.display = tela === 'produtos' ? 'block' : 'none';
    document.getElementById('tela-pedidos').style.display = tela === 'pedidos' ? 'block' : 'none';
    
    if (tela === 'pedidos') renderizarPedidos();
    else renderizarProdutos();

    document.querySelectorAll('.btn-nav').forEach(btn => btn.classList.remove('active'));
    if (event && event.currentTarget) event.currentTarget.classList.add('active');
}

// --- GESTÃO DE PRODUTOS (RENDERIZAÇÃO ATUALIZADA) ---
function renderizarProdutos() {
    if (!tabela) return;
    tabela.innerHTML = produtos.map((p) => `
        <div class="card-produto ${p.emPromocao ? 'card-produto-promo' : ''}">
            <div class="info-corpo-card">
                <span class="categoria">${p.categoria}</span>
                ${p.emPromocao ? '<span class="selo-promo-admin">PROMOÇÃO 🔥</span>' : ''}
                <h3 title="${p.nome}">${p.nome}</h3>
                <p class="preco">R$ ${parseFloat(p.preco).toFixed(2)}</p>
            </div>
            <div class="acoes-card-prod">
                <button class="btn-editar-prod" onclick="window.abrirModalEdicao('${p.docId}')">✏️ Editar</button>
                <button class="btn-excluir-prod" onclick="window.removerProduto('${p.docId}')">❌ Excluir</button>
            </div>
        </div>
    `).join('');
}

// --- LÓGICA DO NOVO MODAL DE EDIÇÃO (NOVO) ---
window.abrirModalEdicao = function(docId) {
    const p = produtos.find(item => item.docId === docId);
    if(!p) return alert("Produto não encontrado!");

    // Preenche os campos do modal
    editDocId.value = docId;
    editNome.value = p.nome;
    editPreco.value = parseFloat(p.preco).toFixed(2);
    editPromo.checked = p.emPromocao === true;

    // Mostra o modal
    modalEdicao.style.display = 'flex';
}

window.fecharModalEdicao = function() {
    modalEdicao.style.display = 'none';
}

// Fecha o modal ao clicar fora dele
window.onclick = function(event) {
    if (event.target == modalEdicao) {
        window.fecharModalEdicao();
    }
}

// Salvar alterações no Firebase
window.confirmarEdicao = async function() {
    const docId = editDocId.value;
    const novoNome = editNome.value;
    const novoPreco = parseFloat(editPreco.value);
    const estaEmPromo = editPromo.checked;

    if(!novoNome || isNaN(novoPreco)) {
        return alert("Preencha nome e preço válidos!");
    }

    try {
        await updateDoc(doc(db, "produtosCardapio", docId), {
            nome: novoNome,
            preco: novoPreco,
            emPromocao: estaEmPromo
        });
        window.fecharModalEdicao();
        // Não precisa alertar, o Firebase atualiza a tela automaticamente
    } catch (e) {
        alert("Erro ao atualizar produto online.");
    }
}

window.removerProduto = async (docId) => {
    if(confirm("Remover do cardápio online?")) {
        await deleteDoc(doc(db, "produtosCardapio", docId));
    }
}

// Cadastrar Produto (Atualizado para ler Promoção)
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const novoProd = {
        id: Date.now(),
        nome: document.getElementById('prod-nome').value,
        categoria: document.getElementById('prod-categoria').value,
        preco: parseFloat(document.getElementById('prod-preco').value),
        desc: document.getElementById('prod-desc').value,
        emPromocao: document.getElementById('prod-promo').checked // Lê do novo checkbox
    };
    try {
        await addDoc(collection(db, "produtosCardapio"), novoProd);
        form.reset();
    } catch (e) { alert("Erro ao salvar no Firebase"); }
});

// --- GESTÃO DE PEDIDOS (Restaura o layout original) ---
function renderizarPedidos() {
    if (!listaPedidos) return;
    
    if (pedidos.length === 0) {
        listaPedidos.innerHTML = '<p style="text-align:center; padding:40px; color:#94a3b8;">Aguardando pedidos...</p>';
        return;
    }

    listaPedidos.innerHTML = [...pedidos].sort((a,b) => b.id - a.id).map((ped) => {
        const pendente = ped.status === 'pendente';
        return `
        <div class="pedido-card ${pendente ? 'pedido-novo' : ''}">
            <div class="pedido-info">
                <h4 style="color: ${pendente ? '#ef4444' : '#10b981'}; margin: 0;">#${ped.numero} - ${ped.cliente}</h4>
                <p>${ped.itens.map(i => i.nome).join(', ')}</p>
                <strong>Total: R$ ${parseFloat(ped.total).toFixed(2)}</strong>
            </div>
            <div class="acoes-pedidos">
                <button class="btn-imprimir" onclick="window.imprimirPedido('${ped.docId}')">⎙ Imprimir</button>
                ${pendente ? `<button class="btn-concluir" onclick="window.concluirPedido('${ped.docId}')">✔️ Concluir</button>` : `<button class="btn-avisar" onclick="window.avisarCliente('${ped.docId}')">📲 Avisar</button>`}
                <button class="btn-remover" onclick="window.removerPedidoApenas('${ped.docId}')">🇽 Apagar</button>
            </div>
        </div>`;
    }).join('');
    atualizarBadge();
}

window.concluirPedido = async (docId) => await updateDoc(doc(db, "pedidosRecebidos", docId), { status: 'concluido' });
window.removerPedidoApenas = async (docId) => confirm("Apagar histórico?") && await deleteDoc(doc(db, "pedidosRecebidos", docId));

window.avisarCliente = function(docId) {
    const ped = pedidos.find(p => p.docId === docId);
    const meuWhatsapp = "5538988287076"; 
    const msg = `Olá ${ped.cliente}, seu pedido #${ped.numero} está pronto!`;
    window.open(`https://api.whatsapp.com/send?phone=55${ped.telefone.replace(/\D/g, '')}&text=${encodeURIComponent(msg)}`);
}

window.imprimirPedido = function(docId) {
    const ped = pedidos.find(p => p.docId === docId);
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    const docPrint = iframe.contentWindow.document;
    docPrint.write(`<html><head><style>body{font-family:monospace;width:80mm;padding:5px;}</style></head><body><h2>BURGUER MANIA</h2><p>${ped.hora}</p><p>CLIENTE: ${ped.cliente}</p><h2>TOTAL: R$ ${ped.total}</h2></body></html>`);
    docPrint.close();
    iframe.contentWindow.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
}

function atualizarBadge() {
    const badge = document.getElementById('badge-pedidos');
    const novos = pedidos.filter(p => p.status === 'pendente').length;
    if(badge) { badge.innerText = novos || ""; badge.style.display = novos > 0 ? "inline-block" : "none"; }
}
