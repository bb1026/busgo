window.addEventListener('load', () => {
  const hasData = localStorage.getItem('busRoutes');
  if (!hasData) {
    updateData(); // 仅首次加载时调用
  } else {
    const time = localStorage.getItem('dataUpdateTime') || '暂无记录';
    const el = document.getElementById('update-time');
    if (el) el.innerText = time;
  }
});

function selectNav(item) {
  // 清除所有导航项的选中状态
  let navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(nav => nav.classList.remove('selected'));

  // 为当前点击的导航项添加选中状态
  item.classList.add('selected');

  // 获取当前点击的图标类型
  const iconClass = item.querySelector('i').classList[1]; // 例如 "fa-star", "fa-map-marker-alt" 等
  const contentDiv = document.getElementById('content');

  // 判断是否缺少缓存数据
  const missingData =
    !localStorage.getItem('busRoutes') ||
    !localStorage.getItem('busServices') ||
    !localStorage.getItem('busStops');

  // 若当前页面需要数据且缺失，则提示下载
  const needsData = ['fa-map-marker-alt', 'fa-route']; // 哪些页面需要用到数据
  if (needsData.includes(iconClass) && missingData) {
    if (confirm('当前无缓存数据，是否立即下载？')) {
      updateData(); // 启动下载和进度条
      return; // 暂时不切换页面，等待下载完成
    } else {
      contentDiv.innerHTML = '<p style="color: red;">无缓存数据，页面内容无法显示。</p>';
      return;
    }
  }

  // 页面逻辑根据导航图标处理
  if (iconClass === 'fa-map-marker-alt') { // 附近站点
    const cached = localStorage.getItem('location');
    if (cached) {
      const loc = JSON.parse(cached);
      contentDiv.innerHTML = `<p class="location">当前位置：${loc.latitude}, ${loc.longitude}</p>`;
    } else {
      contentDiv.innerHTML = '正在获取当前位置...';
      getLocation();
    }
  } else if (iconClass === 'fa-star') { // 我的收藏
    contentDiv.innerHTML = '显示我的收藏内容...';
  } else if (iconClass === 'fa-route') { // 巴士路线
    contentDiv.innerHTML = '显示巴士路线内容...';
  } else if (iconClass === 'fa-subway') { // 地铁
    contentDiv.innerHTML = '显示地铁信息...开发中!!!';
  } else if (iconClass === 'fa-cogs') { // 设置
    getVersionNumber().then(version => {
      const lastUpdate = localStorage.getItem('dataUpdateTime') || '暂无记录';
      const refreshInterval = localStorage.getItem('refreshInterval') || '15';
      contentDiv.innerHTML = `
        <p><strong>版本号：</strong>${version}</p>
        <hr>
        <p><strong>数据更新时间：</strong><span id="update-time">${lastUpdate}</span></p>
        <button onclick="updateData()">更新</button>
        <hr>
        <button class="danger-btn" onclick="clearCache()">清除缓存</button>
        <hr>
        <p>
          <strong>刷新间隔：</strong>
          <input type="number" id="refresh-interval" value="${refreshInterval}" min="5" max="600" style="width: 60px;">
          秒
        </p>
        <button onclick="saveRefreshInterval()">保存</button>
      `;
    });
  }
}

//下载数据
async function fetchAndCacheAll() {
  const datasets = Object.keys(apiUrls);
  showOverlay();

  for (let i = 0; i < datasets.length; i++) {
    const name = datasets[i];
    const data = await fetchAllData(apiUrls[name], maxSkip[name]);
    localStorage.setItem(name, JSON.stringify(data));

    // 更新进度条
    const percent = Math.round(((i + 1) / datasets.length) * 100);
    setProgress(percent);
  }

  const now = new Date().toLocaleString();
  localStorage.setItem('dataUpdateTime', now);

  const updateEl = document.getElementById('update-time');
  if (updateEl) updateEl.innerText = now;

  hideOverlay();
}

async function updateData() {
  if (!confirm('是否确认更新所有缓存数据？这可能需要几秒钟时间。')) return;

  try {
    await fetchAndCacheAll();
    alert('数据已成功更新！');
  } catch (e) {
    alert('更新失败: ' + e);
  }
}

function getLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lon = position.coords.longitude.toFixed(6);
        localStorage.setItem('location', JSON.stringify({ latitude: lat, longitude: lon }));

        const selected = document.querySelector('.nav-item.selected');
        if (selected && selected.querySelector('i').classList.contains('fa-map-marker-alt')) {
          const contentDiv = document.getElementById('content');
          contentDiv.innerHTML = `<p class="location">当前位置：${lat}, ${lon}</p>`;
        }
      },
      (error) => {
        const contentDiv = document.getElementById('content');
        contentDiv.innerHTML = `定位失败：${error.message}`;
      }
    );
  } else {
    const contentDiv = document.getElementById('content');
    contentDiv.innerHTML = '浏览器不支持定位。';
  }
}

function updateData() {
  const now = new Date();
  const formatted = now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0') + ' ' +
    String(now.getHours()).padStart(2, '0') + ':' +
    String(now.getMinutes()).padStart(2, '0');

  localStorage.setItem('dataUpdateTime', formatted);
  document.getElementById('update-time').textContent = formatted;
  alert('数据更新时间已更新');
}

// 获取版本号
function getVersionNumber() {
  return new Promise((resolve, reject) => {
    fetch('https://raw.githubusercontent.com/bb1026/busgo/main/version.txt')
      .then(response => {
        if (!response.ok) {
          throw new Error('无法加载版本号文件');
        }
        return response.text();
      })
      .then(version => {
        resolve(version.trim());  // 去除多余空格
      })
      .catch(error => {
        console.error(error);
        resolve('未知版本');
      });
  });
}

function clearCache() {
  if (confirm("确定要清除所有缓存数据吗？此操作不可恢复。")) {
    // 清除缓存项
    localStorage.removeItem('busRoutes');
    localStorage.removeItem('busServices');
    localStorage.removeItem('busStops');
    localStorage.removeItem('dataUpdateTime');

    // 弹窗提示
    alert("缓存已清除！");

    // 更新“数据更新时间”显示
    const updateEl = document.getElementById('update-time');
    if (updateEl) {
      updateEl.innerText = '无缓存记录';
    }
  }
}

//刷新间隔
function saveRefreshInterval() {
  const input = document.getElementById('refresh-interval');
  let value = parseInt(input.value);

  if (isNaN(value) || value < 5 || value > 600) {
    alert('请输入 5 到 600 秒之间的数字');
    return;
  }

  localStorage.setItem('refreshInterval', value);
  alert(`刷新间隔已设置为 ${value} 秒`);
}

// 默认选中“我的收藏”
window.onload = () => {
  const defaultNav = document.querySelector('.nav-item');
  if (defaultNav) selectNav(defaultNav);
};

//进度条动画
function showOverlay() {
  document.getElementById('overlay').classList.remove('hidden');
  setProgress(0);
}

function hideOverlay() {
  document.getElementById('overlay').classList.add('hidden');
}

function setProgress(percent) {
  document.getElementById('progress').style.width = `${percent}%`;
}