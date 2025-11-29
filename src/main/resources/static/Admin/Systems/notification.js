function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl backdrop-blur-xl border transition-all duration-300 transform translate-x-full ${
        type === 'success' 
            ? 'bg-green-500/90 dark:bg-green-600/90 border-green-400/50 text-white' 
            : 'bg-red-500/90 dark:bg-red-600/90 border-red-400/50 text-white'
    }`;
    
    const icon = type === 'success' ? 'check_circle' : 'error';
    const iconColor = type === 'success' ? 'text-green-100' : 'text-red-100';
    
    notification.innerHTML = `
        <span class="material-symbols-outlined text-3xl ${iconColor}">${icon}</span>
        <span class="font-semibold">${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}


