// Toggle Theme
const toggleButton = document.getElementById('theme-toggle');

if (toggleButton) {
  toggleButton.addEventListener('click', () => {
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.style.backgroundColor = '#EAE7DE';
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.style.backgroundColor = '#111216';
      localStorage.setItem('theme', 'dark');
    }
  });
}

// Modal search
const modal = document.getElementById('searchModal');
const modalContent = document.getElementById('searchModalContent');
const openBtn = document.getElementById('openSearchModal');
const closeBtn = document.getElementById('closeSearchModal');

function openModal() {
	modal.classList.remove('hidden');
	setTimeout(() => {
		modal.classList.add('opacity-100');
		modalContent.classList.remove('scale-75', 'opacity-0');
		modalContent.classList.add('scale-100', 'opacity-100');
	}, 10);
}

function closeModal() {
	modalContent.classList.remove('scale-100', 'opacity-100');
	modalContent.classList.add('scale-75', 'opacity-0');
	setTimeout(() => {
		modal.classList.remove('opacity-100');
		modal.classList.add('hidden');
	}, 300);
}

openBtn.addEventListener('click', openModal);
closeBtn.addEventListener('click', closeModal);
    
modal.addEventListener('click', function(event) {
	if (event.target === modal) {
		closeModal();
	}
});

// Menu sidebar
const menuBtnMenu = document.getElementById('menuBtnMenu');
const closeBtnMenu = document.getElementById('closeBtnMenu');
const sidebarMenu = document.getElementById('sidebarMenu');

menuBtnMenu.addEventListener('click', () => {
	sidebarMenu.classList.remove('translate-x-full');
});

closeBtnMenu.addEventListener('click', () => {
	sidebarMenu.classList.add('translate-x-full');
});