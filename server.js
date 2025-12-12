const express = require('express');
const cors = require('cors');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// CONEXÃO MONGODB
const MONGO_URI = "mongodb+srv://midnight123:midnight123@cluster1.bpoznnx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1";

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ Conectado ao MongoDB!"))
    .catch(err => console.error("❌ Erro Mongo:", err));

if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use(express.static(__dirname));

// --- SCHEMAS ---
const UserSchema = new mongoose.Schema({
    nome: String, email: { type: String, unique: true }, senha: String,
    avatar: String, capa: String, bio: String, xp: { type: Number, default: 0 },
    nivel: { type: Number, default: 1 }, seguindo: [String], seguidores: [String]
});
const User = mongoose.model('User', UserSchema);

const PostSchema = new mongoose.Schema({
    emailAutor: String, nome: String, avatar: String, conteudo: String, midiaUrl: String,
    tipo: String, likes: { type: Number, default: 0 },
    comentarios: [{ autor: String, emailAutor: String, avatar: String, texto: String }],
    timestamp: { type: Date, default: Date.now }
});
const Post = mongoose.model('Post', PostSchema);

// CARRO (ATUALIZADO COM STATS DE RIVALS)
const CarroSchema = new mongoose.Schema({
    dono: String, emailDono: String, marca: String, modelo: String, apelido: String,
    imagemUrl: String, imagens: [String], audioUrl: String,
    descricao: String, specs: Object, mods: [String],
    // NOVOS CAMPOS PARA RIVALS:
    votos: { type: Number, default: 0 },
    batalhas: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now }
});
const Carro = mongoose.model('Carro', CarroSchema);

const SprintSchema = new mongoose.Schema({
    autor: String, emailAutor: String, avatar: String, descricao: String, videoUrl: String,
    likes: { type: Number, default: 0 }, comentarios: [{ autor: String, avatar: String, texto: String }],
    timestamp: { type: Date, default: Date.now }
});
const Sprint = mongoose.model('Sprint', SprintSchema);

const ComunidadeSchema = new mongoose.Schema({
    nome: String, descricao: String, dono: String, imagem: String,
    membros: [String], admins: [String], online: Number
});
const Comunidade = mongoose.model('Comunidade', ComunidadeSchema);

const ForumSchema = new mongoose.Schema({
    comunidadeId: String, titulo: String, conteudo: String, autor: String, emailAutor: String,
    avatar: String, imagemUrl: String, likes: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now }
});
const Forum = mongoose.model('Forum', ForumSchema);

const NotificacaoSchema = new mongoose.Schema({
    tipo: String, de: String, avatar: String, para: String, texto: String, imgPreview: String,
    lida: { type: Boolean, default: false }, timestamp: { type: Date, default: Date.now }
});
const Notificacao = mongoose.model('Notificacao', NotificacaoSchema);

const ChatSchema = new mongoose.Schema({
    de: String, para: String, texto: String, timestamp: { type: Date, default: Date.now }
});
const Chat = mongoose.model('Chat', ChatSchema);

const StorySchema = new mongoose.Schema({
    emailAutor: String, nome: String, avatar: String, midiaUrl: String, tipo: String,
    timestamp: { type: Number, default: Date.now }
});
const Story = mongoose.model('Story', StorySchema);

const NewsSchema = new mongoose.Schema({
    titulo: String, categoria: String, data: String, imagem: String, texto: String
});
const News = mongoose.model('News', NewsSchema);

// --- HELPERS ---
async function ganharXP(email, qtd) {
    if(!email) return;
    const user = await User.findOne({ email });
    if (user) {
        user.xp = (user.xp || 0) + qtd;
        const novoNivel = Math.floor(user.xp / 1000) + 1;
        if (novoNivel > user.nivel) user.nivel = novoNivel;
        await user.save();
    }
}
async function notificar(tipo, deObj, paraEmail, texto, img = null) {
    if (deObj.email === paraEmail) return;
    const recente = await Notificacao.findOne({ tipo, de: deObj.nome, para: paraEmail, timestamp: { $gt: new Date(Date.now() - 300000) } });
    if (!recente) await Notificacao.create({ tipo, de: deObj.nome, avatar: deObj.avatar, para: paraEmail, texto, imgPreview: img });
}

// --- ROTAS ---

// RIVALS (NOVO SISTEMA DE BATALHA)
app.get('/rivals/par', async (req, res) => {
    try {
        // Pega 2 carros aleatórios usando agregação do Mongo
        const carros = await Carro.aggregate([{ $sample: { size: 2 } }]);
        if (carros.length < 2) return res.status(400).send("Garagem insuficiente");
        res.json(carros);
    } catch (e) { res.status(500).send("Erro"); }
});

app.post('/rivals/votar', async (req, res) => {
    try {
        const { vencedorId, perdedorId } = req.body;
        
        // Atualiza Vencedor (+1 Voto, +1 Batalha)
        const carroV = await Carro.findByIdAndUpdate(vencedorId, { $inc: { votos: 1, batalhas: 1 } }, { new: true });
        // Atualiza Perdedor (+1 Batalha apenas)
        await Carro.findByIdAndUpdate(perdedorId, { $inc: { batalhas: 1 } });

        // Dá XP ao dono do carro vencedor!
        if(carroV && carroV.emailDono) {
            ganharXP(carroV.emailDono, 15); // +15 XP por vitória
        }
        res.send('Ok');
    } catch (e) { res.status(500).send("Erro"); }
});

// ... (teus imports: express, mongoose, cors, etc)

// Habilitar CORS para aceitar pedidos de qualquer lugar
app.use(cors());
app.use(express.json());

// --- ROTA CRÍTICA: BUSCAR DADOS DO PERFIL ---
app.get('/perfil/dados', async (req, res) => {
    // 1. Tenta pegar o email da URL (?email=...)
    let emailAlvo = req.query.email;

    // 2. Se não vier na URL, tenta pegar do corpo (fallback raro)
    if (!emailAlvo) {
        emailAlvo = req.body.email;
    }

    if (!emailAlvo) {
        return res.status(400).json({ erro: "Email é obrigatório para carregar o perfil." });
    }

    try {
        // Busca no banco de dados (ajuste 'Usuario' para o nome do teu Schema)
        const usuario = await Usuario.findOne({ email: emailAlvo });

        if (!usuario) {
            return res.status(404).json({ erro: "Usuário não encontrado." });
        }

        // Retorna os dados
        res.json(usuario);
    } catch (error) {
        console.error("Erro ao buscar perfil:", error);
        res.status(500).json({ erro: "Erro interno do servidor." });
    }
});

// ... (resto das tuas rotas: login, cadastro, carros, posts)


// (MANTÉM AS OUTRAS ROTAS PADRÃO AQUI - LOGIN, REGISTRO, ETC)
// ... [Copiar as rotas anteriores de Auth, Perfil, Uploads, etc aqui] ...
// Para não ficar gigante, vou resumir as rotas padrão. Mantenha as que já tem no arquivo anterior.

app.post('/registro', async (req, res) => { if (await User.findOne({ email: req.body.email })) return res.status(400).send('Email em uso'); const hash = await bcrypt.hash(req.body.senha, 10); const novo = await User.create({ ...req.body, senha: hash, avatar: `https://ui-avatars.com/api/?name=${req.body.nome}&background=ef4444&color=fff`, capa: "https://via.placeholder.com/1000x300", bio: "Novo piloto" }); res.status(201).json(novo); });
app.post('/login', async (req, res) => { const user = await User.findOne({ email: req.body.email }); if (!user || !(await bcrypt.compare(req.body.senha, user.senha))) return res.status(401).send('Erro login'); res.json(user); });
app.get('/perfil/dados', async (req, res) => res.json(await User.findOne({ email: req.query.email }) || {}));
app.post('/perfil/atualizar', upload.fields([{name:'avatar'},{name:'capa'}]), async (req, res) => { const upd = { nome: req.body.nome, bio: req.body.bio }; if(req.files['avatar']) upd.avatar = `/uploads/${req.files['avatar'][0].filename}`; if(req.files['capa']) upd.capa = `/uploads/${req.files['capa'][0].filename}`; const u = await User.findOneAndUpdate({ email: req.body.emailOriginal }, upd, { new: true }); res.json(u); });
app.post('/perfil/senha', async (req, res) => { const u = await User.findOne({ email: req.body.email }); if(u && await bcrypt.compare(req.body.senhaAntiga, u.senha)) { u.senha = await bcrypt.hash(req.body.senhaNova, 10); await u.save(); res.send('Ok'); } else res.status(401).send('Senha errada'); });
app.post('/perfil/email', async (req, res) => { if(await User.findOne({ email: req.body.novoEmail })) return res.status(400).send('Em uso'); const u = await User.findOneAndUpdate({ email: req.body.emailAtual }, { email: req.body.novoEmail }, { new: true }); res.json(u); });
app.delete('/perfil/deletar', async (req, res) => { await User.findOneAndDelete({ email: req.body.email }); res.send('Ok'); });
app.get('/carros', async (req, res) => res.json(await Carro.find()));
const cpUpload = upload.fields([{ name: 'imagens', maxCount: 12 }, { name: 'audio', maxCount: 1 }]);
app.post('/carros', cpUpload, async (req, res) => { const imagensUrls = req.files['imagens'] ? req.files['imagens'].map(f => `/uploads/${f.filename}`) : []; const audioUrl = req.files['audio'] ? `/uploads/${req.files['audio'][0].filename}` : null; const imagemPrincipal = imagensUrls.length > 0 ? imagensUrls[0] : 'https://via.placeholder.com/600'; await Carro.create({ ...req.body, imagemUrl: imagemPrincipal, imagens: imagensUrls, audioUrl: audioUrl, mods: req.body.mods ? req.body.mods.split(',') : [], specs: { hp: req.body.potencia, torque: req.body.torque, zero_cem: req.body.zero_cem, top_speed: req.body.top_speed, cor: req.body.cor, ano: req.body.ano, motor: req.body.motor, cambio: req.body.cambio, tracao: req.body.tracao, peso: req.body.peso } }); ganharXP(req.body.emailDono, 100); res.status(201).send('Ok'); });
app.put('/carros/:id', cpUpload, async (req, res) => { const updateData = { ...req.body }; updateData.specs = { hp: req.body.potencia, torque: req.body.torque, zero_cem: req.body.zero_cem, top_speed: req.body.top_speed, cor: req.body.cor, ano: req.body.ano, motor: req.body.motor, cambio: req.body.cambio, tracao: req.body.tracao, peso: req.body.peso }; updateData.mods = req.body.mods ? req.body.mods.split(',') : []; if (req.files['imagens']) { updateData.imagens = req.files['imagens'].map(f => `/uploads/${f.filename}`); updateData.imagemUrl = updateData.imagens[0]; } if (req.files['audio']) { updateData.audioUrl = `/uploads/${req.files['audio'][0].filename}`; } await Carro.findByIdAndUpdate(req.params.id, updateData); res.send('Ok'); });
app.delete('/carros/:id', async (req, res) => { if(mongoose.isValidObjectId(req.params.id)) await Carro.findByIdAndDelete(req.params.id); res.send('Ok'); });
app.get('/posts', async (req, res) => res.json(await Post.find().sort({ timestamp: -1 }).limit(50)));
app.post('/posts', upload.single('midia'), async (req, res) => { const u = req.file ? `/uploads/${req.file.filename}` : null; const t = (req.file && req.file.mimetype.startsWith('video')) ? 'video' : 'imagem'; await Post.create({ ...req.body, midiaUrl: u, tipo: t }); ganharXP(req.body.emailAutor, 50); res.status(201).send('Ok'); });
app.post('/posts/like/:id', async (req, res) => { if (mongoose.isValidObjectId(req.params.id)) { const p = await Post.findById(req.params.id); if(p){ p.likes++; await p.save(); if(p.emailAutor) notificar('like', {nome:req.body.quemDeuLikeNome,email:req.body.quemDeuLikeEmail,avatar:req.body.quemDeuLikeAvatar}, p.emailAutor, 'curtiu.', p.midiaUrl); res.send('Ok'); } } });
app.post('/posts/comentar/:id', async (req, res) => { if (mongoose.isValidObjectId(req.params.id)) { const p = await Post.findById(req.params.id); if(p){ p.comentarios.push(req.body); await p.save(); if(p.emailAutor) notificar('comentario', {nome:req.body.autor,email:req.body.emailAutor,avatar:req.body.avatar}, p.emailAutor, `comentou: "${req.body.texto}"`, p.midiaUrl); res.json(p.comentarios); } } });
app.get('/stories', async (req, res) => res.json(await Story.find({ timestamp: { $gt: Date.now() - 86400000 } })));
app.post('/stories', upload.single('midia'), async (req, res) => { const v = req.file.mimetype.startsWith('video'); await Story.create({ ...req.body, midiaUrl: `/uploads/${req.file.filename}`, tipo: v?'video':'imagem' }); res.status(201).send('Ok'); });
app.get('/sprints', async (req, res) => res.json(await Sprint.find().sort({ timestamp: -1 })));
app.post('/sprints', upload.single('video'), async (req, res) => { if(!req.file) return res.status(400).send('X'); await Sprint.create({ ...req.body, videoUrl: `/uploads/${req.file.filename}` }); ganharXP(req.body.emailAutor, 40); res.status(201).send('Ok'); });
app.post('/sprints/like/:id', async (req, res) => { if(mongoose.isValidObjectId(req.params.id)) { const s = await Sprint.findById(req.params.id); if(s) { s.likes++; await s.save(); res.send('Ok'); } } });
app.post('/sprints/comentar/:id', async (req, res) => { if(mongoose.isValidObjectId(req.params.id)){ const s = await Sprint.findById(req.params.id); if(s){ s.comentarios.push(req.body); await s.save(); res.json(s.comentarios); } } });
app.get('/comunidades', async (req, res) => res.json(await Comunidade.find()));
app.post('/comunidades', upload.single('imagem'), async (req, res) => { const u = req.file ? `/uploads/${req.file.filename}` : 'https://via.placeholder.com/800'; await Comunidade.create({ ...req.body, imagem: u, membros: [req.body.donoEmail] }); ganharXP(req.body.donoEmail, 150); res.status(201).send('Ok'); });
app.post('/comunidades/entrar', async (req, res) => { if(mongoose.isValidObjectId(req.body.id)){ const c=await Comunidade.findById(req.body.id); if(c&&!c.membros.includes(req.body.email)){c.membros.push(req.body.email); await c.save(); ganharXP(req.body.email, 20); res.send('Ok');} } });
app.post('/comunidades/sair', async (req, res) => { if(mongoose.isValidObjectId(req.body.id)){ const c=await Comunidade.findById(req.body.id); if(c){c.membros=c.membros.filter(m=>m!==req.body.email); await c.save(); res.send('Ok');} } });
app.get('/topicos/:id', async (req, res) => res.json(await Forum.find({ comunidadeId: req.params.id })));
app.post('/topicos', upload.single('imagem'), async (req, res) => { const u = req.file ? `/uploads/${req.file.filename}` : null; await Forum.create({ ...req.body, imagemUrl: u }); ganharXP(req.body.emailAutor, 30); res.status(201).send('Ok'); });
app.post('/topicos/like/:id', async (req, res) => { if(mongoose.isValidObjectId(req.params.id)){ const t=await Forum.findById(req.params.id); if(t){t.likes++; await t.save(); res.send('Ok');}} });
app.delete('/topicos/:id', (req, res) => { if(mongoose.isValidObjectId(req.params.id)) Forum.findByIdAndDelete(req.params.id); res.send('Ok'); });
app.get('/usuarios', async (req, res) => res.json(await User.find({}, 'nome email avatar nivel seguindo')));
app.get('/pesquisa', async (req, res) => { const t = new RegExp(req.query.q, 'i'); res.json({ usuarios: await User.find({ nome: t }), carros: await Carro.find({ $or: [{ modelo: t }, { apelido: t }] }) }); });
app.post('/seguir', async (req, res) => { const { eu, ele } = req.body; const uEu = await User.findOne({ email: eu }); const uEle = await User.findOne({ email: ele }); if(uEu && uEle) { if(uEu.seguindo.includes(ele)) { uEu.seguindo = uEu.seguindo.filter(e => e !== ele); uEle.seguidores = uEle.seguidores.filter(e => e !== eu); await uEu.save(); await uEle.save(); res.json({ aSeguir: false }); } else { uEu.seguindo.push(ele); uEle.seguidores.push(eu); await uEu.save(); await uEle.save(); notificar('follow', { nome: uEu.nome, email: eu, avatar: uEu.avatar }, ele, 'seguiu-te.'); res.json({ aSeguir: true }); } } });
app.get('/notificacoes', async (req, res) => res.json(await Notificacao.find({ para: req.query.user }).sort({ timestamp: -1 })));
app.post('/notificacoes/ler', async (req, res) => { await Notificacao.updateMany({ para: req.body.user }, { lida: true }); res.send('Ok'); });
app.get('/mensagens', async (req, res) => res.json(await Chat.find({ $or: [{de:req.query.eu,para:req.query.ele}, {de:req.query.ele,para:req.query.eu}] }).sort({ timestamp: 1 })));
app.post('/mensagens', async (req, res) => { await Chat.create(req.body); res.status(201).send('Ok'); });
app.get('/ranking', async (req, res) => res.json(await User.find({}, 'nome avatar nivel xp email').sort({ xp: -1 }).limit(50)));
app.get('/news', (req, res) => { try{res.json(JSON.parse(fs.readFileSync('news.json')))}catch{res.json([])} });

app.listen(PORT, () => console.log(`🔥 Server Online na porta ${PORT}`));
