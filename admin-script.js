import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// Elementos do DOM
const form = document.getElementById('form-cadastro');
const tabela = document.getElementById('tabela-produtos'); 
const listaPedidos = document.getElementById('lista-pedidos-recebidos');
const somNotificacao = new Audio('https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3');

// Elementos do Modal de Edição
const modalEdicao = document.getElementById('modal-edicao');
const editDocId = document.getElementById('edit-docId');
const editNome = document.getElementById('edit-nome');
const editPreco = document.getElementById('edit-preco');
const editPromo = document.getElementById('edit-promo');

// Elementos de Status e Faturamento
const checkStatusLoja = document.getElementById('check-status-loja');
const labelStatus = document.getElementById('label-status');

// --- 1. CONTROLE DE STATUS DA LOJA (REAL-TIME) ---
onSnapshot(doc(db, "configuracoes", "status"), (docSnap) => {
    if (docSnap.exists()) {
        const estaAberta = docSnap.data().aberta;
        if (checkStatusLoja) checkStatusLoja.checked = estaAberta;
        if (labelStatus) {
            labelStatus.innerText = estaAberta ? "LOJA ABERTA ✅" : "LOJA FECHADA ❌";
            labelStatus.style.color = estaAberta ? "#10b981" : "#ef4444";
        }
    }
});

window.toggleStatusLoja = async function() {
    const novoStatus = checkStatusLoja.checked;
    await setDoc(doc(db, "configuracoes", "status"), { aberta: novoStatus });
};

// --- 2. ESCUTA PRODUTOS ---
onSnapshot(collection(db, "produtosCardapio"), (snapshot) => {
    produtos = [];
    snapshot.forEach(doc => produtos.push({ docId: doc.id, ...doc.data() }));
    renderizarProdutos();
});

// --- 3. ESCUTA PEDIDOS & FATURAMENTO ---
onSnapshot(collection(db, "pedidosRecebidos"), (snapshot) => {
    let novosPedidos = [];
    snapshot.forEach(doc => novosPedidos.push({ docId: doc.id, ...doc.data() }));
    
    if (novosPedidos.length > totalPedidosAntigo && totalPedidosAntigo !== 0) {
        somNotificacao.play().catch(() => {});
    }
    
    pedidos = novosPedidos;
    totalPedidosAntigo = pedidos.length;
    renderizarPedidos();
    atualizarFaturamento();
});

// --- 4. FUNÇÕES DE NAVEGAÇÃO ---
window.alternarTela = function(tela) {
    document.getElementById('tela-produtos').style.display = tela === 'produtos' ? 'block' : 'none';
    document.getElementById('tela-pedidos').style.display = tela === 'pedidos' ? 'block' : 'none';
    document.getElementById('tela-relatorios').style.display = tela === 'relatorios' ? 'block' : 'none';
    
    document.querySelectorAll('.btn-nav').forEach(btn => btn.classList.remove('active'));
    if (event && event.currentTarget) event.currentTarget.classList.add('active');
};

// --- 5. GESTÃO DE PRODUTOS ---
function renderizarProdutos() {
    if (!tabela) return;
    tabela.innerHTML = produtos.map((p) => `
        <div class="card-produto ${p.emPromocao ? 'card-produto-promo' : ''}">
            <div class="info-corpo-card">
                <span class="categoria">${p.categoria}</span>
                ${p.emPromocao ? '<span class="selo-promo-admin">PROMOÇÃO 🔥</span>' : ''}
                <h3>${p.nome}</h3>
                <p class="preco">R$ ${parseFloat(p.preco).toFixed(2)}</p>
            </div>
            <div class="acoes-card-prod">
                <button onclick="window.abrirModalEdicao('${p.docId}')">🖋 Editar</button>
                <button onclick="window.removerProduto('${p.docId}')">❌ Excluir</button>
            </div>
        </div>
    `).join('');
}

window.abrirModalEdicao = function(docId) {
    const p = produtos.find(item => item.docId === docId);
    editDocId.value = docId;
    editNome.value = p.nome;
    editPreco.value = parseFloat(p.preco).toFixed(2);
    editPromo.checked = p.emPromocao === true;
    modalEdicao.style.display = 'flex';
};

window.fecharModalEdicao = () => modalEdicao.style.display = 'none';

window.confirmarEdicao = async function() {
    const docId = editDocId.value;
    try {
        await updateDoc(doc(db, "produtosCardapio", docId), {
            nome: editNome.value,
            preco: parseFloat(editPreco.value),
            emPromocao: editPromo.checked
        });
        fecharModalEdicao();
    } catch (e) { alert("Erro ao atualizar."); }
};

// 1. Função chamada pelo botão "Excluir" do card
window.removerProduto = (id) => {
    document.getElementById('excluir-docId').value = id;
    document.getElementById('modal-confirmar-exclusao').style.display = 'flex';
};

// 2. Função para fechar o modal
window.fecharModalExcluir = () => {
    document.getElementById('modal-confirmar-exclusao').style.display = 'none';
};

// 3. Função que deleta de fato no Firebase
window.confirmarExclusaoReal = async () => {
    const id = document.getElementById('excluir-docId').value;
    
    try {
        // Supondo que sua coleção se chame 'produtos'
        const docRef = doc(db, "produtos", id); 
        await deleteDoc(docRef);
        
        window.fecharModalExcluir();
        exibirToast("Produto removido com sucesso! 🗑️");
        
    } catch (error) {
        console.error("Erro ao remover:", error);
        exibirToast("Erro ao remover o produto.");
    }
};

// --- EVENTO DE CADASTRO CORRIGIDO ---
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nome = document.getElementById('prod-nome').value;
    const categoria = document.getElementById('prod-categoria').value.trim();
    const preco = parseFloat(document.getElementById('prod-preco').value);
    const desc = document.getElementById('prod-desc').value;
    const promo = document.getElementById('prod-promo').checked;

    // Criando o objeto
    const novoProduto = {
        nome: nome,
        categoria: categoria,
        preco: preco,
        desc: desc,
        emPromocao: promo,
        disponivel: true,
        dataCriacao: new Date()
    };

    try {
        // CORREÇÃO AQUI: Enviando 'novoProduto' corretamente
        await addDoc(collection(db, "produtosCardapio"), novoProduto);
        form.reset();
       // Substitua o alert por isso:
const exibirToast = (mensagem) => {
    const toast = document.getElementById('toast-sucesso');
    const toastMsg = document.getElementById('toast-mensagem');
    
    toastMsg.innerText = mensagem;
    toast.style.display = 'flex';

    // Some sozinho após 3 segundos
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
};

// Dentro da sua função de salvar, no final do sucesso:
exibirToast("Produto cadastrado com sucesso! 🍔");
    } catch (e) { 
        console.error("Erro detalhado do Firebase:", e);
        alert("Erro ao salvar! Verifique se as Regras do Firebase estão publicadas."); 
    }
});

// --- 6. GESTÃO DE PEDIDOS ---
function renderizarPedidos() {
    if (!listaPedidos) return;
    if (pedidos.length === 0) {
        listaPedidos.innerHTML = '<p style="text-align:center; padding:40px; color:#94a3b8;">Nenhum pedido recebido.</p>';
        return;
    }

    listaPedidos.innerHTML = [...pedidos].sort((a,b) => b.id - a.id).map((ped) => {
        const pendente = ped.status === 'pendente';
        return `
        <div class="pedido-card ${pendente ? 'pedido-novo' : ''}" style="border-left: 5px solid ${pendente ? '#ef4444' : '#10b981'}">
            <div class="pedido-info">
                <h4 style="margin:0; color:${pendente ? '#ef4444' : '#10b981'}">#${ped.numero || ped.id.toString().slice(-4)} - ${ped.cliente}</h4>
                <p style="margin:5px 0;">${ped.itens.map(i => i.nome).join(', ')}</p>
                <small>🕒 ${ped.hora} | 💰 ${ped.pagamento}</small><br>
                <strong>Total: R$ ${parseFloat(ped.total).toFixed(2)}</strong>
            </div>
            <div class="acoes-pedidos">
                <button class="btn-imprimir" onclick="window.imprimirPedido('${ped.docId}')">⎙ Imprimir Cupom</button>
                ${pendente ? 
                    `<button class="btn-concluir" onclick="window.concluirPedido('${ped.docId}')" style="background:#10b981; color:white;">✔️ Concluir</button>` : 
                    `<button class="btn-avisar" onclick="window.avisarCliente('${ped.docId}')" style="background:#3b82f6; color:white;">📲 Avisar Cliente</button>`
                }
                <button onclick="window.removerPedido('${ped.docId}')" style="background:#ef4444; color:white;">🇽 Apagar</button>
            </div>
        </div>`;
    }).join('');
    atualizarBadge();
}

// --- 7. IMPRESSÃO PROFISSIONAL ---
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
                    .numero { font-size: 35pt; font-weight: bold; border: 2px solid #000; display: inline-block; padding: 5px 15px; margin: 10px 0; }
                </style>
            </head>
            <body>
                <div class="center">
                    <h2 style="margin:0">SANTO LANCHE'S</h2>
                    <div class="numero">#${ped.numero || ped.id.toString().slice(-4)}</div>
                    <p>${ped.data || ''} - ${ped.hora}</p>
                </div>
                <div class="line"></div>
                <p><b>CLIENTE:</b> ${ped.cliente.toUpperCase()}</p>
                <p><b>TELEFONE:</b> ${ped.telefone}</p>
                <p><b>ENTREGA:</b> ${ped.tipo === 'entrega' ? 'SIM' : 'RETIRADA'}</p>
                ${ped.tipo === 'entrega' ? `<p><b>ENDEREÇO:</b> ${ped.endereco}</p>` : ''}
                <div class="line"></div>
                <p><b>PRODUTOS:</b></p>
                ${ped.itens.map(i => `<div>1x ${i.nome} <span style="float:right">R$ ${parseFloat(i.preco).toFixed(2)}</span></div>`).join('')}
                <div class="line"></div>
                <p><b>PAGAMENTO:</b> ${ped.pagamento}</p>
                ${ped.observacao ? `<p><b>OBS:</b> ${ped.observacao}</p>` : ''}
                <h2 style="text-align:right">TOTAL: R$ ${parseFloat(ped.total).toFixed(2)}</h2>
                <div class="center"><p>*** Obrigado pela preferência ***</p></div>
            </body>
        </html>
    `);

    docPrint.close();
    setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        document.body.removeChild(iframe);
    }, 500);
};

// --- 8. FATURAMENTO & AUXILIARES ---
function atualizarFaturamento() {
    const hoje = new Date().toLocaleDateString('pt-BR');
    let totalH = 0, totalG = 0;
    pedidos.forEach(p => {
        const v = parseFloat(p.total) || 0;
        totalG += v;
        if (p.data === hoje) totalH += v;
    });
    const tHoje = document.getElementById('total-hoje');
    const tGeral = document.getElementById('total-geral');
    if (tHoje) tHoje.innerText = `R$ ${totalH.toFixed(2)}`;
    if (tGeral) tGeral.innerText = `R$ ${totalG.toFixed(2)}`;
}

window.concluirPedido = async (docId) => await updateDoc(doc(db, "pedidosRecebidos", docId), { status: 'concluido' });
window.removerPedido = async (docId) => confirm("Apagar do histórico?") && await deleteDoc(doc(db, "pedidosRecebidos", docId));

window.avisarCliente = function(docId) {
    const ped = pedidos.find(p => p.docId === docId);
    const msg = `Olá ${ped.cliente}, seu pedido #${ped.numero} está pronto e saiu para entregar!`;
    window.open(`https://api.whatsapp.com/send?phone=55${ped.telefone.replace(/\D/g, '')}&text=${encodeURIComponent(msg)}`);
};

function atualizarBadge() {
    const badge = document.getElementById('badge-pedidos');
    const novos = pedidos.filter(p => p.status === 'pendente').length;
    if(badge) {
        badge.innerText = novos || "";
        badge.style.display = novos > 0 ? "inline-block" : "none";
    }
}
