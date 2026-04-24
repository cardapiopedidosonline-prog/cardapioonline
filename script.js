import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

let carrinho = [];
let produtosLoja = [];

const dadosPix = {
    chave: "seu-email-ou-cpf@pix.com",
    nome: "BURGUER MANIA LTDA",
    cidade: "Diamantina"
};

// --- ESCUTA O CARDÁPIO ONLINE ---
onSnapshot(collection(db, "produtosCardapio"), (snapshot) => {
    produtosLoja = [];
    snapshot.forEach(doc => {
        produtosLoja.push({ docId: doc.id, ...doc.data() });
    });
    carregarCardapio();
});

function carregarCardapio() {
    const container = document.getElementById('cardapio-container');
    if (!container) return;
    
    if (produtosLoja.length === 0) {
        container.innerHTML = "<p style='text-align:center; grid-column: 1/-1;'>Carregando produtos...</p>";
        return;
    }

    container.innerHTML = produtosLoja.map(p => `
        <div class="produto">
            <div class="prod-info">
                <h3>${p.nome}</h3>
                <p>${p.desc || 'Delicioso hambúrguer artesanal'}</p>
                <span>R$ ${parseFloat(p.preco).toFixed(2)}</span>
            </div>
            <button onclick="adicionarAoCarrinho('${p.nome}', ${p.preco})">
                Adicionar
            </button>
        </div>
    `).join('');
}

window.adicionarAoCarrinho = function(nome, preco) {
    carrinho.push({ nome, preco });
    document.getElementById('qtd-itens').innerText = `${carrinho.length} Itens`;
    const total = carrinho.reduce((sum, i) => sum + i.preco, 0);
    document.getElementById('valor-total').innerText = `R$ ${total.toFixed(2)}`;
}

window.abrirModal = function() {
    if (carrinho.length === 0) return alert("Carrinho vazio!");
    document.getElementById('modal-checkout').style.display = 'block';
}

window.fecharModal = function() {
    document.getElementById('modal-checkout').style.display = 'none';
}

window.toggleEndereco = function() {
    const tipo = document.getElementById('tipo-entrega').value;
    const secao = document.getElementById('secao-endereco');
    if(secao) {
        secao.style.display = tipo === 'entrega' ? 'block' : 'none';
    }
}

window.gerenciarPagamentoPix = function() {
    const formaPagamento = document.getElementById('pagamento').value;
    const areaPix = document.getElementById('area-pix');
    
    if (formaPagamento === 'pix') {
        alert(`📌 DADOS PARA PAGAMENTO PIX\n\nChave: ${dadosPix.chave}\nNome: ${dadosPix.nome}\n\nFavor enviar o comprovante pelo WhatsApp após finalizar!`);
        if(areaPix) areaPix.style.display = 'block';
    } else {
        if(areaPix) areaPix.style.display = 'none';
    }
}

window.confirmarPedido = async function() {
    const nome = document.getElementById('cliente-nome').value;
    const fone = document.getElementById('cliente-fone').value;
    const tipoEntrega = document.getElementById('tipo-entrega').value;
    const endereco = document.getElementById('cliente-endereco').value;
    const formaPagamento = document.getElementById('pagamento').value;
    const observacao = document.getElementById('cliente-obs').value;
    
    if (!nome || !fone) return alert("Preencha nome e WhatsApp!");
    if (tipoEntrega === 'entrega' && !endereco) return alert("Informe o endereço!");

    const totalCarrinho = carrinho.reduce((sum, i) => sum + i.preco, 0);
    const pedidoId = Date.now();
    const numeroPedido = pedidoId.toString().slice(-4);

    let msgWhatsApp = `*🎫 PEDIDO #${numeroPedido} - BURGUER MANIA*\n`;
    msgWhatsApp += `------------------------------\n`;
    msgWhatsApp += `*👤 Cliente:* ${nome}\n`;
    msgWhatsApp += `*📞 WhatsApp:* ${fone}\n`;
    msgWhatsApp += `*🛵 Entrega:* ${tipoEntrega === 'entrega' ? 'Sim' : 'Não (Retirada)'}\n`;
    if(tipoEntrega === 'entrega') msgWhatsApp += `*📍 Endereço:* ${endereco}\n`;
    const pgtoTexto = formaPagamento === 'pix' ? 'PIX (Comprovante em anexo ⏳)' : formaPagamento.toUpperCase();
    msgWhatsApp += `*💳 Pagamento:* ${pgtoTexto}\n\n*🛒 ITENS:*\n`;
    carrinho.forEach(item => { msgWhatsApp += `✅ ${item.nome} - R$ ${parseFloat(item.preco).toFixed(2)}\n`; });
    if(observacao) msgWhatsApp += `\n*📝 Obs:* ${observacao}\n`;
    msgWhatsApp += `\n*💰 TOTAL: R$ ${totalCarrinho.toFixed(2)}*`;

    const novoPedido = {
        id: pedidoId,
        numero: numeroPedido,
        cliente: nome,
        telefone: fone.replace(/\D/g, ''),
        tipo: tipoEntrega,
        endereco: tipoEntrega === 'entrega' ? endereco : 'Retirada no local',
        pagamento: formaPagamento,
        observacao: observacao,
        itens: [...carrinho],
        total: totalCarrinho,
        status: 'pendente',
        hora: new Date().toLocaleTimeString(),
        data: new Date().toLocaleDateString()
    };

    try {
        await addDoc(collection(db, "pedidosRecebidos"), novoPedido);
        const meuWhatsapp = "5538988287076"; 
        window.open(`https://api.whatsapp.com/send?phone=${meuWhatsapp}&text=${encodeURIComponent(msgWhatsApp)}`, '_blank');
        
        alert(`Pedido #${numeroPedido} enviado com sucesso!`);
        carrinho = [];
        document.getElementById('qtd-itens').innerText = "0 Itens";
        document.getElementById('valor-total').innerText = "R$ 0,00";
        fecharModal();
    } catch (e) {
        alert("Erro ao salvar pedido online.");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    carregarCardapio();
    const selectPagamento = document.getElementById('pagamento');
    if(selectPagamento) selectPagamento.addEventListener('change', window.gerenciarPagamentoPix);
    const selectEntrega = document.getElementById('tipo-entrega');
    if(selectEntrega) selectEntrega.addEventListener('change', window.toggleEndereco);
});