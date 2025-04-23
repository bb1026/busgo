document.addEventListener('DOMContentLoaded', function() {
    // DOM元素
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const resultsDiv = document.getElementById('results');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    const progressBar = document.getElementById('progress');
    const progressText = document.getElementById('progressText');
    const tabRoutes = document.getElementById('tabRoutes');
    const tabStops = document.getElementById('tabStops');
    const tabArrivals = document.getElementById('tabArrivals');
    
    // API配置
    const API_KEY = 'XXPgdr5QSdifeDNhghGGrw=='; 
    const API_BASE_URL = 'https://datamall2.mytransport.sg/ltaodataservice';
    
    // 应用状态
    let currentTab = 'routes';
    let busRoutes = [];
    let busStops = [];
    let lastUpdated = null;
    
    // 初始化
    setupEventListeners();
    checkCache();
    
    function setupEventListeners() {
        // 搜索按钮点击事件
        searchBtn.addEventListener('click', performSearch);
        
        // 输入框回车事件
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') performSearch();
        });
        
        // 标签切换事件
        tabRoutes.addEventListener('click', () => switchTab('routes'));
        tabStops.addEventListener('click', () => switchTab('stops'));
        tabArrivals.addEventListener('click', () => switchTab('arrivals'));
    }
    
    function switchTab(tab) {
        currentTab = tab;
        
        // 更新UI
        tabRoutes.classList.remove('active');
        tabStops.classList.remove('active');
        tabArrivals.classList.remove('active');
        
        if (tab === 'routes') tabRoutes.classList.add('active');
        if (tab === 'stops') tabStops.classList.add('active');
        if (tab === 'arrivals') tabArrivals.classList.add('active');
        
        // 更新搜索框提示
        if (tab === 'arrivals') {
            searchInput.placeholder = "输入公交站点代码(如01012)...";
        } else if (tab === 'routes') {
            searchInput.placeholder = "输入公交线路(如105)...";
        } else {
            searchInput.placeholder = "输入公交站点名称或代码(如Hotel Grand Pacific)...";
        }
        
        // 如果有搜索词，重新搜索
        if (searchInput.value.trim()) {
            performSearch();
        } else {
            resultsDiv.innerHTML = '<div class="no-results"><i class="fas fa-info-circle"></i><p>请输入搜索内容</p></div>';
        }
    }
    
    function performSearch() {
        const query = searchInput.value.trim();
        if (!query) {
            resultsDiv.innerHTML = '<div class="no-results"><i class="fas fa-info-circle"></i><p>请输入搜索内容</p></div>';
            return;
        }
        
        if (currentTab === 'routes') {
            searchRoutes(query);
        } else if (currentTab === 'stops') {
            searchStops(query);
        } else if (currentTab === 'arrivals') {
            getBusArrivals(query);
        }
    }
    
    function searchRoutes(query) {
        if (!busRoutes.length) {
            showMessage('数据尚未加载完成，请稍后再试');
            return;
        }
        
        const lowerQuery = query.toLowerCase();
        const results = busRoutes.filter(route => 
            route.ServiceNo.toLowerCase().includes(lowerQuery) || 
            (route.Description && route.Description.toLowerCase().includes(lowerQuery))
        );
        
        displayRouteResults(results);
    }
    
    function searchStops(query) {
        if (!busStops.length) {
            showMessage('数据尚未加载完成，请稍后再试');
            return;
        }
        
        const lowerQuery = query.toLowerCase();
        const results = busStops.filter(stop => 
            stop.Description.toLowerCase().includes(lowerQuery) || 
            stop.BusStopCode.toLowerCase().includes(lowerQuery) ||
            stop.RoadName.toLowerCase().includes(lowerQuery)
        );
        
        displayStopResults(results);
    }
    
    async function getBusArrivals(busStopCode) {
        if (!/^\d{5}$/.test(busStopCode)) {
            showMessage('请输入有效的5位公交站点代码');
            return;
        }
        
        showLoading('加载实时到站信息...');
        
        try {
            const response = await fetch(`${API_BASE_URL}/BusArrivalv2?BusStopCode=${busStopCode}`, {
                headers: {
                    'AccountKey': API_KEY,
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) throw new Error('API请求失败');
            
            const data = await response.json();
            
            if (data && data.Services) {
                displayArrivalResults(data.Services, busStopCode);
            } else {
                showMessage('未找到该站点的到站信息');
            }
        } catch (error) {
            console.error('获取到站信息失败:', error);
            showMessage('加载到站信息失败，请重试');
        } finally {
            hideLoading();
        }
    }
    
    function displayRouteResults(routes) {
        if (!routes.length) {
            showMessage('没有找到匹配的公交线路');
            return;
        }
        
        let html = '';
        
        routes.forEach(route => {
            const firstBus = route.WD_FirstBus || route.SAT_FirstBus || route.SUN_FirstBus || '未知';
            const lastBus = route.WD_LastBus || route.SAT_LastBus || route.SUN_LastBus || '未知';
            
            html += `
                <div class="bus-route">
                    <h3><i class="fas fa-bus"></i> ${route.ServiceNo}路</h3>
                    <p><i class="fas fa-info-circle"></i> 运营公司: ${route.Operator || '未知'}</p>
                    <p><i class="fas fa-route"></i> 方向: ${route.Direction === 1 ? '方向1' : '方向2'}</p>
                    <p><i class="fas fa-map-marker-alt"></i> 站点代码: ${route.BusStopCode}</p>
                    
                    <div class="route-info">
                        <span><i class="far fa-clock"></i> 首班: ${formatBusTime(firstBus)}</span>
                        <span><i class="far fa-clock"></i> 末班: ${formatBusTime(lastBus)}</span>
                        <span><i class="fas fa-arrows-alt-h"></i> 距离: ${route.Distance ? route.Distance.toFixed(1) + 'km' : '未知'}</span>
                        <span><i class="fas fa-sort-numeric-down"></i> 顺序: ${route.StopSequence}</span>
                    </div>
                </div>
            `;
        });
        
        resultsDiv.innerHTML = html;
    }
    
    function displayStopResults(stops) {
        if (!stops.length) {
            showMessage('没有找到匹配的公交站点');
            return;
        }
        
        let html = '';
        
        stops.forEach(stop => {
            html += `
                <div class="bus-stop">
                    <h3><i class="fas fa-map-marker-alt"></i> ${stop.Description}</h3>
                    <p><i class="fas fa-hashtag"></i> 站点代码: ${stop.BusStopCode}</p>
                    <p><i class="fas fa-road"></i> 道路: ${stop.RoadName}</p>
                    <p><i class="fas fa-map-pin"></i> 位置: ${stop.Latitude ? stop.Latitude.toFixed(6) : '未知'}, ${stop.Longitude ? stop.Longitude.toFixed(6) : '未知'}</p>
                    
                    <button class="view-arrivals" data-stop-code="${stop.BusStopCode}">
                        <i class="fas fa-clock"></i> 查看实时到站
                    </button>
                </div>
            `;
        });
        
        resultsDiv.innerHTML = html;
        
        // 添加查看实时到站按钮的事件监听
        document.querySelectorAll('.view-arrivals').forEach(button => {
            button.addEventListener('click', function() {
                const stopCode = this.getAttribute('data-stop-code');
                switchTab('arrivals');
                searchInput.value = stopCode;
                getBusArrivals(stopCode);
            });
        });
    }
    
    function displayArrivalResults(services, busStopCode) {
        if (!services || !services.length) {
            showMessage('该站点暂无公交到站信息');
            return;
        }
        
        // 查找站点名称
        const stop = busStops.find(s => s.BusStopCode === busStopCode);
        const stopName = stop ? stop.Description : busStopCode;
        
        let html = `
            <div class="bus-stop">
                <h3><i class="fas fa-map-marker-alt"></i> ${stopName}</h3>
                <p><i class="fas fa-hashtag"></i> 站点代码: ${busStopCode}</p>
            </div>
        `;
        
        services.forEach(service => {
            if (!service.ServiceNo) return;
            
            const nextBus = service.NextBus;
            const nextBus2 = service.NextBus2;
            const nextBus3 = service.NextBus3;
            
            html += `
                <div class="bus-arrival">
                    <h3><i class="fas fa-bus"></i> ${service.ServiceNo}路 (${service.Operator})</h3>
                    
                    <div class="arrival-times">
                        <div class="arrival-time">
                            <div class="time">${formatArrivalTime(nextBus?.EstimatedArrival)}</div>
                            <div class="label">即将到站</div>
                            ${nextBus?.Load ? `<div class="load">${getLoadText(nextBus.Load)}</div>` : ''}
                        </div>
                        
                        <div class="arrival-time">
                            <div class="time">${formatArrivalTime(nextBus2?.EstimatedArrival)}</div>
                            <div class="label">下一班</div>
                            ${nextBus2?.Load ? `<div class="load">${getLoadText(nextBus2.Load)}</div>` : ''}
                        </div>
                        
                        <div class="arrival-time">
                            <div class="time">${formatArrivalTime(nextBus3?.EstimatedArrival)}</div>
                            <div class="label">随后</div>
                            ${nextBus3?.Load ? `<div class="load">${getLoadText(nextBus3.Load)}</div>` : ''}
                        </div>
                    </div>
                    
                    <p><i class="fas fa-location-arrow"></i> 前往: ${service.DestinationCode || '未知'}</p>
                </div>
            `;
        });
        
        resultsDiv.innerHTML = html;
    }
    
    function formatBusTime(timeStr) {
        if (!timeStr || timeStr.length !== 4) return '未知';
        return `${timeStr.substring(0, 2)}:${timeStr.substring(2)}`;
    }
    
    function formatArrivalTime(isoTime) {
        if (!isoTime) return '--:--';
        
        const date = new Date(isoTime);
        if (isNaN(date.getTime())) return '--:--';
        
        const now = new Date();
        const diffMinutes = Math.round((date - now) / 60000);
        
        if (diffMinutes <= 0) return '即将到站';
        if (diffMinutes < 60) return `${diffMinutes}分钟`;
        
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    function getLoadText(loadCode) {
        const loads = {
            'SEA': '座位充足',
            'SDA': '站立空间',
            'LSD': '拥挤'
        };
        return loads[loadCode] || loadCode;
    }
    
    function showMessage(message) {
        resultsDiv.innerHTML = `<div class="no-results"><i class="fas fa-info-circle"></i><p>${message}</p></div>`;
    }
    
    function showLoading(text) {
        loadingText.textContent = text || '加载中...';
        loadingOverlay.style.display = 'flex';
    }
    
    function hideLoading() {
        loadingOverlay.style.display = 'none';
    }
    
    function updateProgress(percent) {
        progressBar.style.width = `${percent}%`;
        progressText.textContent = `${Math.round(percent)}%`;
    }
    
    function checkCache() {
        const cachedRoutes = localStorage.getItem('busRoutes');
        const cachedStops = localStorage.getItem('busStops');
        const cachedTimestamp = localStorage.getItem('lastUpdated');
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        
        if (cachedRoutes && cachedStops && cachedTimestamp && parseInt(cachedTimestamp) > oneDayAgo) {
            // 使用缓存数据
            busRoutes = JSON.parse(cachedRoutes);
            busStops = JSON.parse(cachedStops);
            lastUpdated = parseInt(cachedTimestamp);
            console.log('使用缓存数据');
        } else {
            // 从服务器加载数据
            loadAllData();
        }
    }
    
    async function loadAllData() {
        showLoading('正在加载公交数据...');
        
        try {
            // 加载公交线路数据
            loadingText.textContent = '正在加载公交线路数据 (0/2)...';
            busRoutes = await fetchAllPaginatedData('BusRoutes', 26000, 500);
            updateProgress(50);
            
            // 加载公交站点数据
            loadingText.textContent = '正在加载公交站点数据 (1/2)...';
            busStops = await fetchAllPaginatedData('BusStops', 5500, 500);
            updateProgress(100);
            
            // 保存到缓存
            lastUpdated = Date.now();
            localStorage.setItem('busRoutes', JSON.stringify(busRoutes));
            localStorage.setItem('busStops', JSON.stringify(busStops));
            localStorage.setItem('lastUpdated', lastUpdated.toString());
            
            console.log('数据加载完成', { busRoutes, busStops });
        } catch (error) {
            console.error('加载数据失败:', error);
            showMessage('加载数据失败，请检查网络连接');
        } finally {
            setTimeout(hideLoading, 500);
        }
    }
    
    async function fetchAllPaginatedData(endpoint, totalRecords, pageSize) {
        const totalPages = Math.ceil(totalRecords / pageSize);
        let allData = [];
        
        for (let skip = 0; skip < totalRecords; skip += pageSize) {
            const currentPage = Math.floor(skip / pageSize) + 1;
            const progress = Math.round((skip / totalRecords) * 50 + (endpoint === 'BusRoutes' ? 0 : 50));
            updateProgress(progress);
            
            loadingText.textContent = `正在加载${endpoint === 'BusRoutes' ? '公交线路' : '公交站点'}数据 (${endpoint === 'BusRoutes' ? '0' : '1'}/2) - 第 ${currentPage}/${totalPages} 页...`;
            
            try {
                const response = await fetch(`${API_BASE_URL}/${endpoint}?$skip=${skip}`, {
                    headers: {
                        'AccountKey': API_KEY,
                        'Accept': 'application/json'
                    }
                });
                
                if (!response.ok) throw new Error(`${endpoint} API请求失败`);
                
                const data = await response.json();
                if (data.value && data.value.length) {
                    allData = allData.concat(data.value);
                }
                
                // 避免请求过快
                await new Promise(resolve => setTimeout(resolve, 200));
            } catch (error) {
                console.error(`加载${endpoint}数据失败 (skip=${skip}):`, error);
                // 继续尝试下一页
            }
        }
        
        return allData;
    }
});