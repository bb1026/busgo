// api.js

const headers = {
  AccountKey: "XXPgdr5QSdiFeDNhghGGrw==",  // 请替换为你的真实 Key
  Accept: "application/json"
};

const apiUrls = {
  busRoutes: "https://datamall2.mytransport.sg/ltaodataservice/BusRoutes?$skip=",
  busServices: "https://datamall2.mytransport.sg/ltaodataservice/BusServices?$skip=",
  busStops: "https://datamall2.mytransport.sg/ltaodataservice/BusStops?$skip=",
};

const maxSkip = {
  busRoutes: 26000,
  busServices: 1000,
  busStops: 5500
};

// 获取所有分页数据并缓存
async function fetchAndCacheAll() {
  const datasets = Object.keys(apiUrls);
  for (let name of datasets) {
    const data = await fetchAllData(apiUrls[name], maxSkip[name]);
    localStorage.setItem(name, JSON.stringify(data));
  }
  const now = new Date().toLocaleString();
  localStorage.setItem('dataUpdateTime', now);
}

// 分批请求某一类数据
async function fetchAllData(baseUrl, maxSkipValue) {
  const results = [];
  for (let skip = 0; skip <= maxSkipValue; skip += 500) {
    const url = baseUrl + skip;
    const res = await fetch(url, { headers });
    const json = await res.json();
    if (json.value && json.value.length > 0) {
      results.push(...json.value);
    } else {
      break; // 无数据时提前结束
    }
  }
  return results;
}