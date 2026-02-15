/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyA_uTuynTU1v_FjQkpaU76upIPM0A5WCAc",
    authDomain: "papuig-b9aca.firebaseapp.com",
    projectId: "papuig-b9aca",
    storageBucket: "papuig-b9aca.firebasestorage.app",
    messagingSenderId: "239378910369",
    appId: "1:239378910369:web:61218319e66451450c74e0",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/logo.png',
        data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
