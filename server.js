const express = require('express');
const cors = require('cors');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// --- 1. CONEXÃO MONGODB ---
const MONGO_URI = "mongodb+srv://midnight123:midnight123@cluster1.bpoznnx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1";

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ Conectado ao MongoDB!"))
    .catch(err => console.error("❌ Erro Mongo:", err));

// --- 2. CONFIGURAÇÃO DE UPLOADS ---
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } }); // Limite 100MB

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use(express.static(__dirname)); // Serve os arquivos HTML/CSS/JS da raiz

// --- 3. SCHEMAS (MODELOS DE DADOS) ---

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

const CarroSchema = new mongoose.Schema({
    dono: String, emailDono: String, marca: String, modelo: String, apelido: String,
    imagemUrl: String, imagens: [String], audioUrl: String,
    descricao: String, specs: Object, mods: [String],
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

// --- 4. FUNÇÕES AUXILIARES (HELPERS) ---

async function ganharXP(email, qtd) {
    if(!email) return;
    try {
        const user = await User.findOne({ email });
        if (user) {
            user.xp = (user.xp || 0) + qtd;
            const novoNivel = Math.floor(user.xp / 1000) + 1;
            if (novoNivel > user.nivel) user.nivel = novoNivel;
            await user.save();
        }
    } catch(e) { console.error("Erro XP:", e); }
}

async function notificar(tipo, deObj, paraEmail, texto, img = null) {
    if (!paraEmail || deObj.email === paraEmail) return;
    try {
        // Evita spam: só notifica se não houver notificação igual nos últimos 5 min
        const recente = await Notificacao.findOne({ tipo, de: deObj.nome, para: paraEmail, timestamp: { $gt: new Date(Date.now() - 300000) } });
        if (!recente) await Notificacao.create({ tipo, de: deObj.nome, avatar: deObj.avatar, para: paraEmail, texto, imgPreview: img });
    } catch(e) { console.error("Erro Notificação:", e); }
}

// --- 5. ROTAS DA API ---

// ---> ROTA CRÍTICA: PERFIL (CORRIGIDA) <---
app.get('/perfil/dados', async (req, res) => {
    try {
        let emailAlvo = req.query.email || req.body.email;
        
        if (!emailAlvo || emailAlvo === 'undefined') {
            return res.status(400).json({ erro: "Email inválido" });
        }

        const usuario = await User.findOne({ email: emailAlvo }); // "User" é o nome do Schema
        if (!usuario) {
            return res.status(404).json({ erro: "Usuário não encontrado" });
        }
        res.json(usuario);
    } catch (error) {
        console.error("Erro perfil:", error);
        res.status(500).json({ erro: "Erro servidor" });
    }
});

// AUTENTICAÇÃO
app.post('/registro', async (req, res) => {
    try {
        if (await User.findOne({ email: req.body.email })) return res.status(400).send('Email em uso');
        const hash = await bcrypt.hash(req.body.senha, 10);
        const novo = await User.create({ 
            ...req.body, 
            senha: hash, 
            avatar: `https://ui-avatars.com/api/?name=${req.body.nome}&background=ef4444&color=fff`, 
            capa: "", 
            bio: "Piloto iniciante" 
        });
        res.status(201).json(novo);
    } catch(e) { res.status(500).send('Erro registro'); }
});

app.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user || !(await bcrypt.compare(req.body.senha, user.senha))) return res.status(401).send('Erro login');
        res.json(user);
    } catch(e) { res.status(500).send('Erro login'); }
});

// PERFIL UPDATE
app.post('/perfil/atualizar', upload.fields([{name:'avatar'},{name:'capa'}]), async (req, res) => {
    try {
        const upd = { nome: req.body.nome, bio: req.body.bio };
        if(req.files['avatar']) upd.avatar = `/uploads/${req.files['avatar'][0].filename}`;
        if(req.files['capa']) upd.capa = `/uploads/${req.files['capa'][0].filename}`;
        const u = await User.findOneAndUpdate({ email: req.body.emailOriginal }, upd, { new: true });
        res.json(u);
    } catch(e) { res.status(500).send('Erro update'); }
});

app.post('/seguir', async (req, res) => {
    try {
        const { eu, ele } = req.body;
        const uEu = await User.findOne({ email: eu });
        const uEle = await User.findOne({ email: ele });
        
        if(uEu && uEle) {
            if(uEu.seguindo.includes(ele)) {
                // Deixar de seguir
                uEu.seguindo = uEu.seguindo.filter(e => e !== ele);
                uEle.seguidores = uEle.seguidores.filter(e => e !== eu);
                await uEu.save(); await uEle.save();
                res.json({ aSeguir: false });
            } else {
                // Seguir
                uEu.seguindo.push(ele);
                uEle.seguidores.push(eu);
                await uEu.save(); await uEle.save();
                notificar('follow', { nome: uEu.nome, email: eu, avatar: uEu.avatar }, ele, 'começou a seguir-te.');
                res.json({ aSeguir: true });
            }
        } else {
            res.status(404).send('User not found');
        }
    } catch(e) { res.status(500).send('Erro follow'); }
});

// CARROS
app.get('/carros', async (req, res) => res.json(await Carro.find()));

const cpUpload = upload.fields([{ name: 'imagens', maxCount: 12 }, { name: 'audio', maxCount: 1 }]);
app.post('/carros', cpUpload, async (req, res) => {
    try {
        const imagensUrls = req.files['imagens'] ? req.files['imagens'].map(f => `/uploads/${f.filename}`) : [];
        const audioUrl = req.files['audio'] ? `/uploads/${req.files['audio'][0].filename}` : null;
        const imagemPrincipal = imagensUrls.length > 0 ? imagensUrls[0] : 'https://via.placeholder.com/600';
        
        await Carro.create({ 
            ...req.body, 
            imagemUrl: imagemPrincipal, 
            imagens: imagensUrls, 
            audioUrl: audioUrl, 
            mods: req.body.mods ? req.body.mods.split(',') : [], 
            specs: { 
                hp: req.body.potencia, torque: req.body.torque, zero_cem: req.body.zero_cem, 
                top_speed: req.body.top_speed, cor: req.body.cor, ano: req.body.ano, 
                motor: req.body.motor, cambio: req.body.cambio, tracao: req.body.tracao, peso: req.body.peso 
            } 
        });
        ganharXP(req.body.emailDono, 100);
        res.status(201).send('Ok');
    } catch(e) { res.status(500).send('Erro carro'); }
});

// POSTS
app.get('/posts', async (req, res) => res.json(await Post.find().sort({ timestamp: -1 }).limit(50)));

app.post('/posts', upload.single('midia'), async (req, res) => {
    try {
        const u = req.file ? `/uploads/${req.file.filename}` : null;
        const t = (req.file && req.file.mimetype.startsWith('video')) ? 'video' : 'imagem';
        // Importante: Salva emailAutor corretamente para o link funcionar
        await Post.create({ ...req.body, midiaUrl: u, tipo: t, emailAutor: req.body.emailAutor }); 
        ganharXP(req.body.emailAutor, 50);
        res.status(201).send('Ok');
    } catch(e) { res.status(500).send('Erro post'); }
});

app.post('/posts/like/:id', async (req, res) => {
    try {
        if (mongoose.isValidObjectId(req.params.id)) {
            const p = await Post.findById(req.params.id);
            if(p){ 
                p.likes++; await p.save(); 
                if(p.emailAutor) notificar('like', {nome:req.body.quemDeuLikeNome,email:req.body.quemDeuLikeEmail,avatar:req.body.quemDeuLikeAvatar}, p.emailAutor, 'curtiu o teu post.', p.midiaUrl);
                res.send('Ok'); 
            }
        }
    } catch(e) { res.status(500).send('Erro like'); }
});

// SPRINTS
app.get('/sprints', async (req, res) => res.json(await Sprint.find().sort({ timestamp: -1 })));

app.post('/sprints', upload.single('video'), async (req, res) => {
    try {
        if(!req.file) return res.status(400).send('Sem video');
        await Sprint.create({ ...req.body, videoUrl: `/uploads/${req.file.filename}` });
        ganharXP(req.body.emailAutor, 40);
        res.status(201).send('Ok');
    } catch(e) { res.status(500).send('Erro sprint'); }
});

// RIVALS
app.get('/rivals/par', async (req, res) => {
    try {
        const carros = await Carro.aggregate([{ $sample: { size: 2 } }]);
        if (carros.length < 2) return res.status(400).send("Falta Carros");
        res.json(carros);
    } catch (e) { res.status(500).send("Erro"); }
});

app.post('/rivals/votar', async (req, res) => {
    try {
        const { vencedorId, perdedorId } = req.body;
        const carroV = await Carro.findByIdAndUpdate(vencedorId, { $inc: { votos: 1, batalhas: 1 } }, { new: true });
        await Carro.findByIdAndUpdate(perdedorId, { $inc: { batalhas: 1 } });
        if(carroV && carroV.emailDono) ganharXP(carroV.emailDono, 15);
        res.send('Ok');
    } catch (e) { res.status(500).send("Erro"); }
});

// NOTIFICAÇÕES & RANKING
app.get('/notificacoes', async (req, res) => res.json(await Notificacao.find({ para: req.query.user }).sort({ timestamp: -1 })));
app.post('/notificacoes/ler', async (req, res) => { await Notificacao.updateMany({ para: req.body.user }, { lida: true }); res.send('Ok'); });
app.get('/ranking', async (req, res) => res.json(await User.find({}, 'nome avatar nivel xp email').sort({ xp: -1 }).limit(50)));
app.get('/usuarios', async (req, res) => res.json(await User.find({}, 'nome email avatar nivel seguindo')));

// INICIALIZAR
app.listen(PORT, () => console.log(`🔥 Server CORSA SOCIAL Online na porta ${PORT}`));
