import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
let lojaEstaAbertaNoMomento = true;

const dadosPix = {
    chave: "seu-email-ou-cpf@pix.com",
    nome: "BURGUER MANIA LTDA",
    cidade: "Diamantina"
};

// --- 1. FUNÇÕES DE INTERFACE (MODAIS) ---
window.mostrarAviso = function(titulo, mensagem, icone = '⚠️') {
    const modal = document.getElementById('modal-aviso-cliente');
    if (modal) {
        document.getElementById('titulo-aviso').innerText = titulo;
        document.getElementById('texto-aviso').innerText = mensagem;
        document.getElementById('icone-aviso').innerText = icone;
        modal.style.display = 'flex';
    } else {
        alert(`${icone} ${titulo}: ${mensagem}`);
    }
};

window.fecharModalAviso = function() {
    document.getElementById('modal-aviso-cliente').style.display = 'none';
};

window.abrirModal = function() {
    if (carrinho.length === 0) {
        window.mostrarAviso("Carrinho Vazio", "Adicione pelo menos um item para continuar.", "🛒");
        return;
    }
    const modal = document.getElementById('modal-checkout');
    if(modal) modal.style.display = 'block';
};

window.fecharModal = function() {
    const modal = document.getElementById('modal-checkout');
    if(modal) modal.style.display = 'none';
};

// --- 2. ESCUTA STATUS DA LOJA ---
onSnapshot(doc(db, "configuracoes", "status"), (docSnap) => {
    if (docSnap.exists()) {
        lojaEstaAbertaNoMomento = docSnap.data().aberta;
        const btnConfirmar = document.getElementById('btn-confirmar-pedido');
        
        if (!lojaEstaAbertaNoMomento) {
            if(btnConfirmar) {
                btnConfirmar.disabled = true;
                btnConfirmar.innerText = "LOJA FECHADA ❌";
                btnConfirmar.style.backgroundColor = "#64748b";
                btnConfirmar.style.cursor = "not-allowed";
            }
            document.body.style.filter = "grayscale(0.8)";
            window.mostrarAviso("Loja Fechada", "Caro cliente! Informamos que nosso expediente se encontra encerrado.", "⋆｡ ﾟ☁︎｡ ⋆｡ ﾟ☾ ﾟ｡ ⋆");
        } else {
            if(btnConfirmar) {
                btnConfirmar.disabled = false;
                btnConfirmar.innerText = "CONFIRMAR PEDIDO ✔️";
                btnConfirmar.style.backgroundColor = "#10b981";
                btnConfirmar.style.cursor = "pointer";
            }
            document.body.style.filter = "none";
        }
    }
});

// --- 3. GESTÃO DO CARDÁPIO (COM FILTRO DE DISPONIBILIDADE) ---
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
        container.innerHTML = "<p style='text-align:center; grid-column: 1/-1; color: white;'>Carregando delícias...</p>";
        return;
    }

    const produtosOrdenados = [...produtosLoja].sort((a, b) => {
        return (b.emPromocao === true ? 1 : 0) - (a.emPromocao === true ? 1 : 0);
    });

    container.innerHTML = produtosOrdenados.map(p => {
        // Lógica de disponibilidade
        const estaDisponivel = p.disponivel !== false;
        
        const estiloCard = p.emPromocao 
            ? 'border: 2px solid #f59e0b; background-color: #fffbeb;' 
            : 'background-color: white;';
            
        // Se estiver esgotado, aplica filtro cinza e opacidade
        const filtroEsgotado = !estaDisponivel ? 'filter: grayscale(1); opacity: 0.6;' : '';

        const seloPromo = p.emPromocao 
            ? `<span style="background: #f59e0b; color: white; padding: 2px 8px; border-radius: 50px; font-size: 0.7rem; font-weight: bold; display: inline-block; margin-bottom: 5px;">PROMOÇÃO 🔥</span>` 
            : '';

        return `
            <div class="produto" style="${estiloCard} ${filtroEsgotado} padding: 15px; border-radius: 10px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; color: #1e293b; position: relative;">
                <div class="prod-info" style="flex: 1;">
                    ${seloPromo}
                    <h3 style="margin: 0; color: #0f172a;">${p.nome}</h3>
                    <p style="font-size: 0.9rem; color: #64748b; margin: 5px 0;">${p.desc || ''}</p>
                    <span style="font-weight: bold; color: #10b981; font-size: 1.1rem;">R$ ${parseFloat(p.preco).toFixed(2)}</span>
                    ${!estaDisponivel ? '<br><b style="color: #ef4444; font-size: 0.8rem;">PRODUTO ESGOTADO 📦</b>' : ''}
                </div>
                
                ${estaDisponivel ? `
                    <button onclick="adicionarAoCarrinho('${p.nome}', ${p.preco})" style="background: #ef4444; color: white; border: none; padding: 10px 15px; border-radius: 8px; cursor: pointer; font-weight: bold; margin-left: 10px;">
                        +
                    </button>
                ` : `
                    <button disabled style="background: #64748b; color: white; border: none; padding: 10px 15px; border-radius: 8px; cursor: not-allowed; font-weight: bold; margin-left: 10px;">
                        ❌
                    </button>
                `}
            </div>
        `;
    }).join('');
}

// --- 4. CARRINHO E PEDIDO ---
window.adicionarAoCarrinho = function(nome, preco) {
    if (!lojaEstaAbertaNoMomento) {
        window.mostrarAviso("Expediente Encerrado!", "Não é possível adicionar itens.", "⋆｡ﾟ☁︎｡⋆｡ ﾟ☾ ﾟ｡⋆");
        return;
    }
    
    carrinho.push({ nome, preco });
    document.getElementById('qtd-itens').innerText = `${carrinho.length} Itens`;
    const total = carrinho.reduce((sum, i) => sum + i.preco, 0);
    document.getElementById('valor-total').innerText = `R$ ${total.toFixed(2)}`;
};

window.confirmarPedido = async function() {
    if (!lojaEstaAbertaNoMomento) {
        window.mostrarAviso("Encerrado", "A loja acabou de fechar! Não conseguimos processar seu pedido agora.", "🚫");
        window.fecharModal();
        return; 
    }
    
    const nome = document.getElementById('cliente-nome').value.trim();
    const fone = document.getElementById('cliente-fone').value.trim();
    const tipoEntrega = document.getElementById('tipo-entrega').value;
    const endereco = document.getElementById('cliente-endereco').value.trim();
    const formaPagamento = document.getElementById('pagamento').value;
    const observacao = document.getElementById('cliente-obs').value.trim();
    
    if (!nome) return window.mostrarAviso("Campo Obrigatório", "Por favor, digite seu nome.", "👤");
    if (!fone) return window.mostrarAviso("Campo Obrigatório", "Informe seu WhatsApp para contato.", "📞");
    if (tipoEntrega === 'entrega' && !endereco) {
        return window.mostrarAviso("Endereço Faltando", "Para entregas, precisamos do seu endereço completo.", "📍");
    }
    if (!formaPagamento) return window.mostrarAviso("Pagamento", "Escolha como deseja pagar o seu pedido.", "💳");

    const totalCarrinho = carrinho.reduce((sum, i) => sum + i.preco, 0);
    const pedidoId = Date.now();
    const numeroPedido = pedidoId.toString().slice(-4);

    let msgWhatsApp = `*🎫 PEDIDO #${numeroPedido} - SANTO LANCHE'S*\n`;
    msgWhatsApp += `--------------------------------------\n`;
    msgWhatsApp += `*👤 Cliente:* ${nome}\n`;
    msgWhatsApp += `*📞 WhatsApp:* ${fone}\n`;
    msgWhatsApp += `*🛵 Entrega:* ${tipoEntrega === 'entrega' ? 'Sim' : 'Não (Retirada)'}\n`;
    
    if(tipoEntrega === 'entrega') {
        msgWhatsApp += `*📍 Endereço:* ${endereco}\n`;
    }
    
    const pgtoTexto = formaPagamento === 'pix' ? 'PIX (Comprovante em anexo ❖)' : formaPagamento.toUpperCase();
    msgWhatsApp += `*💳 Pagamento:* ${pgtoTexto}\n`;
    msgWhatsApp += `--------------------------------------\n`;
    msgWhatsApp += `*🛒 ITENS:*\n`;
    
    carrinho.forEach(item => { 
        msgWhatsApp += `✅ ${item.nome} - R$ ${parseFloat(item.preco).toFixed(2)}\n`; 
    });
    
    if(observacao) {
        msgWhatsApp += `\n*📝 Obs:* ${observacao}\n`;
    }
    
    msgWhatsApp += `--------------------------------------\n`;
    msgWhatsApp += `*💰 TOTAL: R$ ${totalCarrinho.toFixed(2)}*`;

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
        data: new Date().toLocaleDateString('pt-BR')
    };

    try {
        await addDoc(collection(db, "pedidosRecebidos"), novoPedido);
        
        const meuWhatsapp = "5538988287076"; 
        window.open(`https://api.whatsapp.com/send?phone=${meuWhatsapp}&text=${encodeURIComponent(msgWhatsApp)}`, '_blank');
        
        window.mostrarAviso("Sucesso!", `Pedido #${numeroPedido} enviado com sucesso!`, "✅");
        
        carrinho = [];
        document.getElementById('qtd-itens').innerText = "0 Itens";
        document.getElementById('valor-total').innerText = "R$ 0,00";
        window.fecharModal();
        
        setTimeout(() => location.reload(), 3000);
    } catch (e) {
        window.mostrarAviso("Erro", "Não conseguimos enviar seu pedido. Tente novamente.", "❌");
    }
};

// --- 5. EVENTOS ---
window.toggleEndereco = function() {
    const tipo = document.getElementById('tipo-entrega').value;
    const secao = document.getElementById('secao-endereco');
    if(secao) secao.style.display = tipo === 'entrega' ? 'block' : 'none';
};

window.gerenciarPagamentoPix = function() {
    const formaPagamento = document.getElementById('pagamento').value;
    const areaPix = document.getElementById('area-pix');
    if (formaPagamento === 'pix') {
        if(areaPix) areaPix.style.display = 'block';
    } else {
        if(areaPix) areaPix.style.display = 'none';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const selectPagamento = document.getElementById('pagamento');
    if(selectPagamento) selectPagamento.addEventListener('change', window.gerenciarPagamentoPix);
    
    const selectEntrega = document.getElementById('tipo-entrega');
    if(selectEntrega) selectEntrega.addEventListener('change', window.toggleEndereco);
});
