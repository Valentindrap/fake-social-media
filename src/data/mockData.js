export const users = [
    {
        id: 1,
        username: 'carlos.dev',
        name: 'Carlos García',
        avatar: 'https://i.pravatar.cc/150?img=11',
        hasStory: true,
    },
    {
        id: 2,
        username: 'lucia.photo',
        name: 'Lucía Martínez',
        avatar: 'https://i.pravatar.cc/150?img=5',
        hasStory: true,
    },
    {
        id: 3,
        username: 'martin.travel',
        name: 'Martín López',
        avatar: 'https://i.pravatar.cc/150?img=12',
        hasStory: true,
    },
    {
        id: 4,
        username: 'vale.art',
        name: 'Valentina Ruiz',
        avatar: 'https://i.pravatar.cc/150?img=9',
        hasStory: true,
    },
    {
        id: 5,
        username: 'diego.music',
        name: 'Diego Torres',
        avatar: 'https://i.pravatar.cc/150?img=15',
        hasStory: true,
    },
    {
        id: 6,
        username: 'sofia.cook',
        name: 'Sofía Hernández',
        avatar: 'https://i.pravatar.cc/150?img=20',
        hasStory: true,
    },
    {
        id: 7,
        username: 'nico.fit',
        name: 'Nicolás Pérez',
        avatar: 'https://i.pravatar.cc/150?img=33',
        hasStory: true,
    },
    {
        id: 8,
        username: 'camila.style',
        name: 'Camila Díaz',
        avatar: 'https://i.pravatar.cc/150?img=25',
        hasStory: true,
    },
    {
        id: 9,
        username: 'juanp.code',
        name: 'Juan Pablo',
        avatar: 'https://i.pravatar.cc/150?img=51',
        hasStory: false,
    },
    {
        id: 10,
        username: 'ana.design',
        name: 'Ana Morales',
        avatar: 'https://i.pravatar.cc/150?img=44',
        hasStory: true,
    },
];

export const currentUser = {
    id: 0,
    username: 'papu.ig',
    name: 'Papu IG',
    avatar: 'https://i.pravatar.cc/150?img=68',
};

export const posts = [
    {
        id: 1,
        user: users[0],
        image: 'https://picsum.photos/seed/post1/800/800',
        caption: 'Nuevo proyecto en React 🚀 La vida del dev nunca para. #coding #react #webdev',
        likes: 234,
        comments: [
            { id: 1, user: users[1], text: '¡Se ve increíble! 🔥' },
            { id: 2, user: users[3], text: 'Quiero aprender React también 💻' },
        ],
        timeAgo: '2h',
    },
    {
        id: 2,
        user: users[1],
        image: 'https://picsum.photos/seed/post2/800/800',
        caption: 'Golden hour en la ciudad ✨ Cada atardecer es una obra de arte.',
        likes: 892,
        comments: [
            { id: 3, user: users[2], text: '¡Qué foto tan hermosa! 📸' },
            { id: 4, user: users[4], text: 'Los colores son espectaculares 🌅' },
            { id: 5, user: users[0], text: 'Tremenda captura 👏' },
        ],
        timeAgo: '4h',
    },
    {
        id: 3,
        user: users[2],
        image: 'https://picsum.photos/seed/post3/800/800',
        caption: 'Explorando nuevos destinos 🌍 La aventura nunca termina. #travel #wanderlust',
        likes: 1547,
        comments: [
            { id: 6, user: users[5], text: '¿Dónde es eso? ¡Quiero ir! 😍' },
            { id: 7, user: users[1], text: 'Increíble lugar ✈️' },
        ],
        timeAgo: '6h',
    },
    {
        id: 4,
        user: users[3],
        image: 'https://picsum.photos/seed/post4/800/800',
        caption: 'Arte digital 🎨 Cada pixel cuenta una historia. #digitalart #creative',
        likes: 673,
        comments: [
            { id: 8, user: users[0], text: 'Tu talento es otro nivel 🎨' },
            { id: 9, user: users[6], text: '¡Me encanta tu estilo!' },
        ],
        timeAgo: '8h',
    },
    {
        id: 5,
        user: users[4],
        image: 'https://picsum.photos/seed/post5/800/800',
        caption: 'Sesión de estudio nocturna 🎵 La música es mi escape. #music #producer',
        likes: 445,
        comments: [
            { id: 10, user: users[2], text: 'Esa mesa de mezclas se ve pro 🎧' },
            { id: 11, user: users[7], text: '¿Cuándo sacas nuevo tema? 🔥' },
        ],
        timeAgo: '12h',
    },
    {
        id: 6,
        user: users[5],
        image: 'https://picsum.photos/seed/post6/800/800',
        caption: 'Receta del día: pasta casera 🍝 Nada como cocinar con amor.',
        likes: 1023,
        comments: [
            { id: 12, user: users[3], text: '¡Se ve delicioso! Pasa la receta 👨‍🍳' },
            { id: 13, user: users[8], text: 'Wow, qué presentación 🤤' },
        ],
        timeAgo: '1d',
    },
];

export const stories = users.filter((u) => u.hasStory);
