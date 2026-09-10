// Toggle Theme
const toggleButton = document.getElementById('theme-toggle');

function showToast(message) {
	let toast = document.getElementById('appToast');
	if (!toast) {
		toast = document.createElement('div');
		toast.id = 'appToast';
		toast.className = 'app-toast';
		document.body.appendChild(toast);
	}
	toast.textContent = message;
	toast.classList.remove('is-visible');
	requestAnimationFrame(() => toast.classList.add('is-visible'));
	clearTimeout(toast.hideTimer);
	toast.hideTimer = setTimeout(() => toast.classList.remove('is-visible'), 2400);
}

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

// Header search toggle with modal fallback
const modal = document.getElementById('searchModal');
const modalContent = document.getElementById('searchModalContent');
const openBtn = document.getElementById('openSearchModal');
const closeBtn = document.getElementById('closeSearchModal');
const headerSearchForm = document.getElementById('headerSearchForm');
const headerSearchInput = document.getElementById('headerSearchInput');
const headerSearchSuggestions = document.getElementById('headerSearchSuggestions');
let suggestionTimer;
let suggestionController;
let suggestionHideTimer;

function hideSearchSuggestions() {
	if (headerSearchSuggestions) {
		clearTimeout(suggestionHideTimer);
		headerSearchSuggestions.classList.remove('is-visible');
		suggestionHideTimer = setTimeout(() => headerSearchSuggestions.classList.add('hidden'), 180);
		headerSearchSuggestions.innerHTML = '';
	}
}

async function loadSearchSuggestions(query) {
	if (!headerSearchSuggestions || query.trim().length < 2) return hideSearchSuggestions();
	headerSearchSuggestions.innerHTML = '<div class="px-3 py-3 text-xs font-semibold text-neutral-500">Mencari...</div>';
	headerSearchSuggestions.classList.remove('hidden');
	if (suggestionController) suggestionController.abort();
	suggestionController = new AbortController();
	try {
		const response = await fetch(`/api/anime-suggestions?q=${encodeURIComponent(query.trim())}`, { signal: suggestionController.signal });
		const result = await response.json();
		const items = result.data || [];
		if (!items.length) return hideSearchSuggestions();
		headerSearchSuggestions.innerHTML = items.map(item => `
			<a href="/anime/${encodeURIComponent(item.slug)}" class="flex items-center gap-2 border-b border-black/10 px-3 py-2 text-xs font-bold text-black transition-colors last:border-b-0 hover:bg-[#FACC15] dark:border-white/10 dark:text-white dark:hover:text-black">
				<img src="${item.image || '/assets/images/no-img.jpg'}" alt="" class="h-9 w-7 rounded object-cover" onerror="this.src='/assets/images/no-img.jpg'">
				<span class="line-clamp-2">${item.title}</span>
			</a>`).join('');
		headerSearchSuggestions.classList.remove('hidden');
		clearTimeout(suggestionHideTimer);
		requestAnimationFrame(() => headerSearchSuggestions.classList.add('is-visible'));
	} catch (error) {
		if (error.name === 'AbortError') return;
		hideSearchSuggestions();
	}
}

function toggleHeaderSearch() {
	const isOpen = headerSearchForm.classList.toggle('is-open');
	headerSearchForm.setAttribute('aria-hidden', String(!isOpen));
	openBtn.setAttribute('aria-expanded', String(isOpen));

	if (isOpen) {
		headerSearchInput.removeAttribute('tabindex');
		setTimeout(() => headerSearchInput.focus(), 180);
	} else {
		headerSearchInput.setAttribute('tabindex', '-1');
	}
}

if (openBtn && headerSearchForm && headerSearchInput) {
	openBtn.addEventListener('click', toggleHeaderSearch);
	headerSearchInput.addEventListener('input', () => {
		clearTimeout(suggestionTimer);
		suggestionTimer = setTimeout(() => loadSearchSuggestions(headerSearchInput.value), 140);
	});
	document.addEventListener('click', event => {
		if (!headerSearchForm.contains(event.target) && !openBtn.contains(event.target)) hideSearchSuggestions();
	});
}

const watchlistButton = document.getElementById('watchlistButton');
if (watchlistButton) {
	const watchlistMenu = document.getElementById('watchlistMenu');
	let watchlistCloseTimer;
	const statusLabels = { planned: 'Planned', watching: 'Watching', on_hold: 'On Hold', dropped: 'Dropped' };
	fetch(`/api/watchlist/${encodeURIComponent(watchlistButton.dataset.slug)}/status`)
		.then(response => response.ok ? response.json() : null)
		.then(result => {
			if (result?.status && statusLabels[result.status]) watchlistButton.querySelector('span').textContent = statusLabels[result.status];
		})
		.catch(() => {});
	const closeWatchlistMenu = () => {
		if (!watchlistMenu || watchlistMenu.classList.contains('hidden')) return;
		watchlistMenu.classList.remove('is-visible');
		clearTimeout(watchlistCloseTimer);
		watchlistCloseTimer = setTimeout(() => watchlistMenu.classList.add('hidden'), 180);
		watchlistButton.setAttribute('aria-expanded', 'false');
	};
	watchlistButton.addEventListener('click', () => {
		if (!watchlistMenu) return;
		const isOpen = watchlistMenu.classList.contains('hidden');
		if (isOpen) {
			clearTimeout(watchlistCloseTimer);
			watchlistMenu.classList.remove('hidden');
		}
		else closeWatchlistMenu();
		watchlistButton.setAttribute('aria-expanded', String(isOpen));
		if (isOpen) requestAnimationFrame(() => watchlistMenu.classList.add('is-visible'));
	});
	document.addEventListener('click', event => {
		if (!watchlistButton.contains(event.target) && !watchlistMenu?.contains(event.target)) closeWatchlistMenu();
	});
	document.addEventListener('keydown', event => {
		if (event.key === 'Escape') closeWatchlistMenu();
	});
	watchlistMenu?.querySelectorAll('[data-watchlist-status]').forEach(option => {
		option.addEventListener('click', async () => {
			const selectedStatus = option.textContent.trim();
			watchlistButton.querySelector('span').textContent = selectedStatus;
			closeWatchlistMenu();
			showToast(`Menyimpan sebagai ${selectedStatus}...`);
			try {
				const response = await fetch('/api/watchlist', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ slug: watchlistButton.dataset.slug, title: watchlistButton.dataset.title, image: watchlistButton.dataset.image, status: option.dataset.watchlistStatus })
				});
				if (response.status === 401) return window.location.href = '/login';
				const result = await response.json();
				if (!result.success) throw new Error(result.message || 'Gagal menyimpan watchlist.');
				showToast(`Watchlist disimpan sebagai ${selectedStatus}`);
			} catch (error) {
				showToast(error.message || 'Gagal menyimpan watchlist.');
			}
		});
	});
}

const progressButton = document.getElementById('progressButton');
if (progressButton) {
	progressButton.addEventListener('click', async () => {
		progressButton.disabled = true;
		const response = await fetch('/api/progress', {
			method: 'POST', headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				animeSlug: progressButton.dataset.animeSlug,
				animeTitle: progressButton.dataset.animeTitle,
				episodeSlug: progressButton.dataset.episodeSlug,
				episodeNumber: progressButton.dataset.episodeNumber
			})
		});
		if (response.status === 401) return window.location.href = '/login';
		const result = await response.json();
		if (result.success) {
			progressButton.textContent = 'Sudah Ditonton';
			progressButton.classList.add('bg-emerald-400');
		}
		progressButton.disabled = false;
	});
}

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

if (!headerSearchForm && openBtn && modal && modalContent && closeBtn) {
	openBtn.addEventListener('click', openModal);
	closeBtn.addEventListener('click', closeModal);

	modal.addEventListener('click', function(event) {
		if (event.target === modal) {
			closeModal();
		}
	});
}

// Menu sidebar
const menuBtnMenu = document.getElementById('menuBtnMenu');
const closeBtnMenu = document.getElementById('closeBtnMenu');
const sidebarMenu = document.getElementById('sidebarMenu');

if (sidebarMenu) {
	// Create or get backdrop
	let sidebarBackdrop = document.getElementById('sidebarBackdrop');
	if (!sidebarBackdrop) {
		sidebarBackdrop = document.createElement('div');
		sidebarBackdrop.id = 'sidebarBackdrop';
		sidebarBackdrop.className = 'fixed inset-0 bg-black/60 z-40 hidden backdrop-blur-xs transition-opacity duration-300 lg:hidden';
		document.body.appendChild(sidebarBackdrop);
	}

	function openSidebar() {
		sidebarMenu.classList.remove('translate-x-full');
		if (sidebarBackdrop) sidebarBackdrop.classList.remove('hidden');
	}

	function closeSidebar() {
		sidebarMenu.classList.add('translate-x-full');
		if (sidebarBackdrop) sidebarBackdrop.classList.add('hidden');
	}

	// Always ensure closed on init
	closeSidebar();

	if (menuBtnMenu) menuBtnMenu.addEventListener('click', openSidebar);
	if (closeBtnMenu) closeBtnMenu.addEventListener('click', closeSidebar);
	if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeSidebar);

	// Close on ESC
	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape') closeSidebar();
	});

	// Close on resize to desktop
	window.addEventListener('resize', () => {
		if (window.innerWidth >= 1024) {
			closeSidebar();
		}
	});

	// Close on bfcache page restore
	window.addEventListener('pageshow', closeSidebar);

	// Close when clicking any nav link inside sidebar
	sidebarMenu.querySelectorAll('a').forEach(link => {
		link.addEventListener('click', closeSidebar);
	});
}

// Watchlist status filters
const watchlistFilters = document.querySelectorAll('[data-watchlist-filter]');
const watchlistItems = document.querySelectorAll('[data-watchlist-item]');
if (watchlistFilters.length && watchlistItems.length) {
	let activeFilter = 'all';
	const labels = { planned: 'Planned', watching: 'Watching', on_hold: 'On hold', dropped: 'Dropped' };
	const summary = document.getElementById('watchlistFilterSummary');
	const visibleCount = document.getElementById('watchlistVisibleCount');
	const filteredEmpty = document.getElementById('watchlistFilteredEmpty');

	function updateWatchlistFilters() {
		const showAll = activeFilter === 'all';
		let totalVisible = 0;
		watchlistItems.forEach(item => {
			const isVisible = showAll || activeFilter === item.dataset.watchlistStatus;
			item.classList.toggle('hidden', !isVisible);
			if (isVisible) totalVisible += 1;
		});

		watchlistFilters.forEach(button => {
			const isActive = activeFilter === button.dataset.watchlistFilter;
			button.setAttribute('aria-pressed', String(isActive));
			button.classList.toggle('bg-[#FACC15]', isActive);
			button.classList.toggle('dark:bg-[#FACC15]', isActive);
			button.classList.toggle('text-black', isActive);
			button.classList.toggle('shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]', isActive);
			button.classList.toggle('dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)]', isActive);
			button.querySelector('[data-filter-check]')?.classList.toggle('hidden', !isActive);
		});

		if (summary) summary.textContent = showAll ? 'Menampilkan semua anime' : `Menampilkan: ${labels[activeFilter]}`;
		if (visibleCount) visibleCount.textContent = `${totalVisible} anime`;
		filteredEmpty?.classList.toggle('hidden', totalVisible !== 0);
	}

	watchlistFilters.forEach(button => button.addEventListener('click', () => {
		activeFilter = button.dataset.watchlistFilter;
		updateWatchlistFilters();
	}));
}
