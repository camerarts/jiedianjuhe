
// 部署完成后在网址后面加上这个，获取自建节点和机场聚合节点，/?token=auto或/auto或

let mytoken = 'samsung1'; //可以随便取，或者uuid生成，https://1024tools.com/uuid
let BotToken = ''; //可以为空，或者@BotFather中输入/start，/newbot，并关注机器人
let ChatID = ''; //可以为空，或者@userinfobot中获取，/start
let TG = 0; //小白勿动， 开发者专用，1 为推送所有的访问信息，0 为不推送订阅转换后端的访问信息与异常访问
let FileName = 'CF-Workers-SUB';
let SUBUpdateTime = 6; //自定义订阅更新时间，单位小时
let total = 99;//TB
let timestamp = 4102329600000;//2099-12-31

// ===== 后台管理密码（HTTP Basic 认证）=====
let AdminUser = 'admin';  // 后台登录用户名
let AdminPass = '';       // 后台登录密码，必填；建议在 Cloudflare 变量里设置 ADMINPASS
let AdminPath = '/admin'; // 后台管理路径，与订阅路径分离；可用变量 ADMINPATH 覆盖

//节点链接 + 订阅链接
let MainData = `
https://raw.githubusercontent.com/mfuu/v2ray/master/v2ray
https://raw.githubusercontent.com/peasoft/NoMoreWalls/master/list_raw.txt
https://raw.githubusercontent.com/ermaozi/get_subscribe/main/subscribe/v2ray.txt
https://raw.githubusercontent.com/aiboboxx/v2rayfree/main/v2
https://raw.githubusercontent.com/mahdibland/SSAggregator/master/sub/airport_sub_merge.txt
https://raw.githubusercontent.com/mahdibland/SSAggregator/master/sub/sub_merge.txt
https://raw.githubusercontent.com/Pawdroid/Free-servers/refs/heads/main/sub
`

let urls = [];
let subConverter = "SUBAPI.fxxk.dedyn.io"; //在线订阅转换后端，目前使用CM的订阅转换功能。支持自建psub 可自行搭建https://github.com/bulianglin/psub
let subConfig = "https://raw.githubusercontent.com/cmliu/ACL4SSR/main/Clash/config/ACL4SSR_Online_MultiCountry.ini"; //订阅配置文件
let subProtocol = 'https';

export default {
	async fetch(request, env) {
		const userAgentHeader = request.headers.get('User-Agent');
		const userAgent = userAgentHeader ? userAgentHeader.toLowerCase() : "null";
		const url = new URL(request.url);
		const token = url.searchParams.get('token');
		mytoken = env.TOKEN || mytoken;
		BotToken = env.TGTOKEN || BotToken;
		ChatID = env.TGID || ChatID;
		TG = env.TG || TG;
		subConverter = env.SUBAPI || subConverter;
		if (subConverter.includes("http://")) {
			subConverter = subConverter.split("//")[1];
			subProtocol = 'http';
		} else {
			subConverter = subConverter.split("//")[1] || subConverter;
		}
		subConfig = env.SUBCONFIG || subConfig;
		FileName = env.SUBNAME || FileName;

		const currentDate = new Date();
		currentDate.setHours(0, 0, 0, 0);
		const timeTemp = Math.ceil(currentDate.getTime() / 1000);
		const fakeToken = await MD5MD5(`${mytoken}${timeTemp}`);
		//console.log(`${fakeUserID}\n${fakeHostName}`); // 打印fakeID

		let UD = Math.floor(((timestamp - Date.now()) / timestamp * total * 1099511627776) / 2);
		total = total * 1099511627776;
		let expire = Math.floor(timestamp / 1000);
		SUBUpdateTime = env.SUBUPTIME || SUBUpdateTime;
		AdminUser = env.ADMINUSER || AdminUser;
		AdminPass = env.ADMINPASS || AdminPass;
		AdminPath = env.ADMINPATH || AdminPath;

		// ===== 后台管理入口（独立路径，与订阅路径彻底分离）=====
		if (url.pathname === AdminPath || url.pathname === AdminPath + '/') {
			const 未通过鉴权 = 后台鉴权(request);
			if (未通过鉴权) return 未通过鉴权;
			if (!env.KV) return new Response('未绑定 KV 空间', { status: 400, headers: { 'Content-Type': 'text/plain; charset=UTF-8' } });
			await 迁移地址列表(env, 'LINK.txt');

			// 节点测速接口（需通过上面的 Basic 认证）
			if (url.searchParams.get('api') === 'ping') {
				if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: { 'Content-Type': 'text/plain; charset=UTF-8' } });
				const 结果 = await 批量测速(await request.text());
				return new Response(JSON.stringify(结果), {
					headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
				});
			}
			await sendMessage(`#编辑订阅 ${FileName}`, request.headers.get('CF-Connecting-IP'), `UA: ${userAgentHeader}</tg-spoiler>\n域名: ${url.hostname}\n<tg-spoiler>入口: ${url.pathname + url.search}</tg-spoiler>`);
			return await KV(request, env, 'LINK.txt');
		}

		if (!(token == mytoken || token == fakeToken || url.pathname == ("/" + mytoken) || url.pathname.includes("/" + mytoken + "?"))) {
			if (TG == 1 && url.pathname !== "/" && url.pathname !== "/favicon.ico") await sendMessage(`#异常访问 ${FileName}`, request.headers.get('CF-Connecting-IP'), `UA: ${userAgent}</tg-spoiler>\n域名: ${url.hostname}\n<tg-spoiler>入口: ${url.pathname + url.search}</tg-spoiler>`);
			if (env.URL302) return Response.redirect(env.URL302, 302);
			else if (env.URL) return await proxyURL(env.URL, url);
			else return new Response(await nginx(), {
				status: 200,
				headers: {
					'Content-Type': 'text/html; charset=UTF-8',
				},
			});
		} else {
			if (env.KV) {
				await 迁移地址列表(env, 'LINK.txt');
				MainData = await env.KV.get('LINK.txt') || MainData;
			} else {
				MainData = env.LINK || MainData;
				if (env.LINKSUB) urls = await ADD(env.LINKSUB);
			}
			let 重新汇总所有链接 = await ADD(MainData + '\n' + urls.join('\n'));
			let 自建节点 = "";
			let 订阅链接 = "";
			for (let x of 重新汇总所有链接) {
				if (x.toLowerCase().startsWith('http')) {
					订阅链接 += x + '\n';
				} else {
					自建节点 += x + '\n';
				}
			}
			MainData = 自建节点;
			urls = await ADD(订阅链接);
			await sendMessage(`#获取订阅 ${FileName}`, request.headers.get('CF-Connecting-IP'), `UA: ${userAgentHeader}</tg-spoiler>\n域名: ${url.hostname}\n<tg-spoiler>入口: ${url.pathname + url.search}</tg-spoiler>`);

			let 订阅格式 = 'base64';
			if (userAgent.includes('null') || userAgent.includes('subconverter') || userAgent.includes('nekobox') || userAgent.includes(('CF-Workers-SUB').toLowerCase())) {
				订阅格式 = 'base64';
			} else if (userAgent.includes('clash') || (url.searchParams.has('clash') && !userAgent.includes('subconverter'))) {
				订阅格式 = 'clash';
			} else if (userAgent.includes('sing-box') || userAgent.includes('singbox') || ((url.searchParams.has('sb') || url.searchParams.has('singbox')) && !userAgent.includes('subconverter'))) {
				订阅格式 = 'singbox';
			} else if (userAgent.includes('surge') || (url.searchParams.has('surge') && !userAgent.includes('subconverter'))) {
				订阅格式 = 'surge';
			} else if (userAgent.includes('quantumult%20x') || (url.searchParams.has('quanx') && !userAgent.includes('subconverter'))) {
				订阅格式 = 'quanx';
			} else if (userAgent.includes('loon') || (url.searchParams.has('loon') && !userAgent.includes('subconverter'))) {
				订阅格式 = 'loon';
			}

			let subConverterUrl;
			let 订阅转换URL = `${url.origin}/${await MD5MD5(fakeToken)}?token=${fakeToken}`;
			//console.log(订阅转换URL);
			let req_data = MainData;

			let 追加UA = 'v2rayn';
			if (url.searchParams.has('clash')) 追加UA = 'clash';
			else if (url.searchParams.has('singbox')) 追加UA = 'singbox';
			else if (url.searchParams.has('surge')) 追加UA = 'surge';
			else if (url.searchParams.has('quanx')) 追加UA = 'Quantumult%20X';
			else if (url.searchParams.has('loon')) 追加UA = 'Loon';

			const 请求订阅响应内容 = await getSUB(urls, request, 追加UA, userAgentHeader);
			console.log(请求订阅响应内容);
			req_data += 请求订阅响应内容[0].join('\n');
			订阅转换URL += "|" + 请求订阅响应内容[1];

			if (env.WARP) 订阅转换URL += "|" + (await ADD(env.WARP)).join("|");
			//修复中文错误
			const utf8Encoder = new TextEncoder();
			const encodedData = utf8Encoder.encode(req_data);
			//const text = String.fromCharCode.apply(null, encodedData);
			const utf8Decoder = new TextDecoder();
			const text = utf8Decoder.decode(encodedData);

			//去重 + 剔除残缺节点（缺少端口的脏节点，会让路由器解析时报“缺少port参数”）
			const 合法节点行 = text.split('\n').filter(line => {
				const l = line.trim();
				if (!l) return false;
				if (/^vmess:\/\//i.test(l)) return true;                  // vmess 是 base64 JSON，交给客户端判断
				if (/^ss:\/\//i.test(l) && !l.includes('@')) return true;  // 整段 base64 的 ss 无法用正则判断，放行
				const m = l.match(/^[a-z0-9]+:\/\/(?:[^@\/]*@)?([^\/?#]+)/i);
				if (!m) return false;
				const hostport = m[1].trim();
				if (!/:\d{1,5}$/.test(hostport)) return false;           // 没有 :端口 直接丢弃
				const p = parseInt(hostport.split(':').pop(), 10);
				return p > 0 && p <= 65535;
			});
			const uniqueLines = new Set(合法节点行);
			const result = [...uniqueLines].join('\n');
			//console.log(result);

			let base64Data;
			try {
				base64Data = btoa(result);
			} catch (e) {
				function encodeBase64(data) {
					const binary = new TextEncoder().encode(data);
					let base64 = '';
					const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

					for (let i = 0; i < binary.length; i += 3) {
						const byte1 = binary[i];
						const byte2 = binary[i + 1] || 0;
						const byte3 = binary[i + 2] || 0;

						base64 += chars[byte1 >> 2];
						base64 += chars[((byte1 & 3) << 4) | (byte2 >> 4)];
						base64 += chars[((byte2 & 15) << 2) | (byte3 >> 6)];
						base64 += chars[byte3 & 63];
					}

					const padding = 3 - (binary.length % 3 || 3);
					return base64.slice(0, base64.length - padding) + '=='.slice(0, padding);
				}

				base64Data = encodeBase64(result);
			}

			if (订阅格式 == 'base64' || token == fakeToken) {
				return new Response(base64Data, {
					headers: {
						"content-type": "text/plain; charset=utf-8",
						"Profile-Update-Interval": `${SUBUpdateTime}`,
						//"Subscription-Userinfo": `upload=${UD}; download=${UD}; total=${total}; expire=${expire}`,
					}
				});
			} else if (订阅格式 == 'clash') {
				subConverterUrl = `${subProtocol}://${subConverter}/sub?target=clash&url=${encodeURIComponent(订阅转换URL)}&insert=false&config=${encodeURIComponent(subConfig)}&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false&new_name=true`;
			} else if (订阅格式 == 'singbox') {
				subConverterUrl = `${subProtocol}://${subConverter}/sub?target=singbox&url=${encodeURIComponent(订阅转换URL)}&insert=false&config=${encodeURIComponent(subConfig)}&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false&new_name=true`;
			} else if (订阅格式 == 'surge') {
				subConverterUrl = `${subProtocol}://${subConverter}/sub?target=surge&url=${encodeURIComponent(订阅转换URL)}&insert=false&config=${encodeURIComponent(subConfig)}&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false&new_name=true`;
			} else if (订阅格式 == 'quanx') {
				subConverterUrl = `${subProtocol}://${subConverter}/sub?target=quanx&url=${encodeURIComponent(订阅转换URL)}&insert=false&config=${encodeURIComponent(subConfig)}&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false&udp=true`;
			} else if (订阅格式 == 'loon') {
				subConverterUrl = `${subProtocol}://${subConverter}/sub?target=loon&url=${encodeURIComponent(订阅转换URL)}&insert=false&config=${encodeURIComponent(subConfig)}&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false`;
			}
			//console.log(订阅转换URL);
			try {
				const subConverterResponse = await fetch(subConverterUrl);

				if (!subConverterResponse.ok) {
					return new Response(base64Data, {
						headers: {
							"content-type": "text/plain; charset=utf-8",
							"Profile-Update-Interval": `${SUBUpdateTime}`,
							//"Subscription-Userinfo": `upload=${UD}; download=${UD}; total=${total}; expire=${expire}`,
						}
					});
					//throw new Error(`Error fetching subConverterUrl: ${subConverterResponse.status} ${subConverterResponse.statusText}`);
				}
				let subConverterContent = await subConverterResponse.text();
				if (订阅格式 == 'clash') subConverterContent = await clashFix(subConverterContent);
				return new Response(subConverterContent, {
					headers: {
						"Content-Disposition": `attachment; filename*=utf-8''${encodeURIComponent(FileName)}`,
						"content-type": "text/plain; charset=utf-8",
						"Profile-Update-Interval": `${SUBUpdateTime}`,
						//"Subscription-Userinfo": `upload=${UD}; download=${UD}; total=${total}; expire=${expire}`,

					},
				});
			} catch (error) {
				return new Response(base64Data, {
					headers: {
						"content-type": "text/plain; charset=utf-8",
						"Profile-Update-Interval": `${SUBUpdateTime}`,
						//"Subscription-Userinfo": `upload=${UD}; download=${UD}; total=${total}; expire=${expire}`,
					}
				});
			}
		}
	}
};

async function ADD(envadd) {
	var addtext = envadd.replace(/[	"'|\r\n]+/g, ',').replace(/,+/g, ',');	// 将空格、双引号、单引号和换行符替换为逗号
	//console.log(addtext);
	if (addtext.charAt(0) == ',') addtext = addtext.slice(1);
	if (addtext.charAt(addtext.length - 1) == ',') addtext = addtext.slice(0, addtext.length - 1);
	const add = addtext.split(',');
	//console.log(add);
	return add;
}

async function nginx() {
	const text = `
	<!DOCTYPE html>
	<html>
	<head>
	<title>Welcome to nginx!</title>
	<style>
		body {
			width: 35em;
			margin: 0 auto;
			font-family: Tahoma, Verdana, Arial, sans-serif;
		}
	</style>
	</head>
	<body>
	<h1>Welcome to nginx!</h1>
	<p>If you see this page, the nginx web server is successfully installed and
	working. Further configuration is required.</p>
	
	<p>For online documentation and support please refer to
	<a href="http://nginx.org/">nginx.org</a>.<br/>
	Commercial support is available at
	<a href="http://nginx.com/">nginx.com</a>.</p>
	
	<p><em>Thank you for using nginx.</em></p>
	</body>
	</html>
	`
	return text;
}

async function sendMessage(type, ip, add_data = "") {
	if (BotToken !== '' && ChatID !== '') {
		let msg = "";
		const response = await fetch(`http://ip-api.com/json/${ip}?lang=zh-CN`);
		if (response.status == 200) {
			const ipInfo = await response.json();
			msg = `${type}\nIP: ${ip}\n国家: ${ipInfo.country}\n<tg-spoiler>城市: ${ipInfo.city}\n组织: ${ipInfo.org}\nASN: ${ipInfo.as}\n${add_data}`;
		} else {
			msg = `${type}\nIP: ${ip}\n<tg-spoiler>${add_data}`;
		}

		let url = "https://api.telegram.org/bot" + BotToken + "/sendMessage?chat_id=" + ChatID + "&parse_mode=HTML&text=" + encodeURIComponent(msg);
		return fetch(url, {
			method: 'get',
			headers: {
				'Accept': 'text/html,application/xhtml+xml,application/xml;',
				'Accept-Encoding': 'gzip, deflate, br',
				'User-Agent': 'Mozilla/5.0 Chrome/90.0.4430.72'
			}
		});
	}
}

function base64Decode(str) {
	const bytes = new Uint8Array(atob(str).split('').map(c => c.charCodeAt(0)));
	const decoder = new TextDecoder('utf-8');
	return decoder.decode(bytes);
}

async function MD5MD5(text) {
	const encoder = new TextEncoder();

	const firstPass = await crypto.subtle.digest('MD5', encoder.encode(text));
	const firstPassArray = Array.from(new Uint8Array(firstPass));
	const firstHex = firstPassArray.map(b => b.toString(16).padStart(2, '0')).join('');

	const secondPass = await crypto.subtle.digest('MD5', encoder.encode(firstHex.slice(7, 27)));
	const secondPassArray = Array.from(new Uint8Array(secondPass));
	const secondHex = secondPassArray.map(b => b.toString(16).padStart(2, '0')).join('');

	return secondHex.toLowerCase();
}

function clashFix(content) {
	if (content.includes('wireguard') && !content.includes('remote-dns-resolve')) {
		let lines;
		if (content.includes('\r\n')) {
			lines = content.split('\r\n');
		} else {
			lines = content.split('\n');
		}

		let result = "";
		for (let line of lines) {
			if (line.includes('type: wireguard')) {
				const 备改内容 = `, mtu: 1280, udp: true`;
				const 正确内容 = `, mtu: 1280, remote-dns-resolve: true, udp: true`;
				result += line.replace(new RegExp(备改内容, 'g'), 正确内容) + '\n';
			} else {
				result += line + '\n';
			}
		}

		content = result;
	}
	return content;
}

async function proxyURL(proxyURL, url) {
	const URLs = await ADD(proxyURL);
	const fullURL = URLs[Math.floor(Math.random() * URLs.length)];

	// 解析目标 URL
	let parsedURL = new URL(fullURL);
	console.log(parsedURL);
	// 提取并可能修改 URL 组件
	let URLProtocol = parsedURL.protocol.slice(0, -1) || 'https';
	let URLHostname = parsedURL.hostname;
	let URLPathname = parsedURL.pathname;
	let URLSearch = parsedURL.search;

	// 处理 pathname
	if (URLPathname.charAt(URLPathname.length - 1) == '/') {
		URLPathname = URLPathname.slice(0, -1);
	}
	URLPathname += url.pathname;

	// 构建新的 URL
	let newURL = `${URLProtocol}://${URLHostname}${URLPathname}${URLSearch}`;

	// 反向代理请求
	let response = await fetch(newURL);

	// 创建新的响应
	let newResponse = new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: response.headers
	});

	// 添加自定义头部，包含 URL 信息
	//newResponse.headers.set('X-Proxied-By', 'Cloudflare Worker');
	//newResponse.headers.set('X-Original-URL', fullURL);
	newResponse.headers.set('X-New-URL', newURL);

	return newResponse;
}

async function getSUB(api, request, 追加UA, userAgentHeader) {
	if (!api || api.length === 0) {
		return [];
	}
	let newapi = "";
	let 订阅转换URLs = "";
	let 异常订阅 = "";
	const controller = new AbortController(); // 创建一个AbortController实例，用于取消请求
	const timeout = setTimeout(() => {
		controller.abort(); // 2秒后取消所有请求
	}, 2000);

	try {
		// 使用Promise.allSettled等待所有API请求完成，无论成功或失败
		const responses = await Promise.allSettled(api.map(apiUrl => getUrl(request, apiUrl, 追加UA, userAgentHeader).then(response => response.ok ? response.text() : Promise.reject(response))));

		// 遍历所有响应
		const modifiedResponses = responses.map((response, index) => {
			// 检查是否请求成功
			if (response.status === 'rejected') {
				const reason = response.reason;
				if (reason && reason.name === 'AbortError') {
					return {
						status: '超时',
						value: null,
						apiUrl: api[index] // 将原始的apiUrl添加到返回对象中
					};
				}
				console.error(`请求失败: ${api[index]}, 错误信息: ${reason.status} ${reason.statusText}`);
				return {
					status: '请求失败',
					value: null,
					apiUrl: api[index] // 将原始的apiUrl添加到返回对象中
				};
			}
			return {
				status: response.status,
				value: response.value,
				apiUrl: api[index] // 将原始的apiUrl添加到返回对象中
			};
		});

		console.log(modifiedResponses); // 输出修改后的响应数组

		for (const response of modifiedResponses) {
			// 检查响应状态是否为'fulfilled'
			if (response.status === 'fulfilled') {
				const content = await response.value || 'null'; // 获取响应的内容
				if (content.includes('proxies') && content.includes('proxy-groups')) {
					订阅转换URLs += "|" + response.apiUrl; // Clash 配置
				} else if (content.includes('outbounds') && content.includes('inbounds')) {
					订阅转换URLs += "|" + response.apiUrl; // Singbox 配置
				} else if (content.includes('://')) {
					newapi += content + '\n'; // 追加内容
				} else if (isValidBase64(content)) {
					newapi += base64Decode(content) + '\n'; // 解码并追加内容
				} else {
					const 异常订阅LINK = `trojan://CMLiussss@127.0.0.1:8888?security=tls&allowInsecure=1&type=tcp&headerType=none#%E5%BC%82%E5%B8%B8%E8%AE%A2%E9%98%85%20${response.apiUrl.split('://')[1].split('/')[0]}`;
					console.log(异常订阅LINK);
					异常订阅 += `${异常订阅LINK}\n`;
				}
			}
		}
	} catch (error) {
		console.error(error); // 捕获并输出错误信息
	} finally {
		clearTimeout(timeout); // 清除定时器
	}

	const 订阅内容 = await ADD(newapi + 异常订阅); // 将处理后的内容转换为数组
	// 返回处理后的结果
	return [订阅内容, 订阅转换URLs];
}

async function getUrl(request, targetUrl, 追加UA, userAgentHeader) {
	// 设置自定义 User-Agent
	const newHeaders = new Headers(request.headers);
	newHeaders.set("User-Agent", `v2rayN/${追加UA} cmliu/CF-Workers-SUB ${userAgentHeader}`);

	// 构建新的请求对象
	const modifiedRequest = new Request(targetUrl, {
		method: request.method,
		headers: newHeaders,
		body: request.method === "GET" ? null : request.body,
		redirect: "follow"
	});

	// 输出请求的详细信息
	console.log(`请求URL: ${targetUrl}`);
	console.log(`请求头: ${JSON.stringify([...newHeaders])}`);
	console.log(`请求方法: ${request.method}`);
	console.log(`请求体: ${request.method === "GET" ? null : request.body}`);

	// 发送请求并返回响应
	return fetch(modifiedRequest);
}

function isValidBase64(str) {
	const base64Regex = /^[A-Za-z0-9+/=]+$/;
	return base64Regex.test(str);
}

async function 迁移地址列表(env, txt = 'ADD.txt') {
	const 旧数据 = await env.KV.get(`/${txt}`);
	const 新数据 = await env.KV.get(txt);

	if (旧数据 && !新数据) {
		// 写入新位置
		await env.KV.put(txt, 旧数据);
		// 删除旧数据
		await env.KV.delete(`/${txt}`);
		return true;
	}
	return false;
}

// ===== 后台：节点解析 / 延迟探测 =====
function 安全Base64解码(s) {
	try {
		let b = String(s || '').trim().replace(/-/g, '+').replace(/_/g, '/').replace(/\s+/g, '');
		while (b.length % 4) b += '=';
		const bin = atob(b);
		return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
	} catch (e) { return ''; }
}

// 从一行链接里解析出 协议 / 备注 / 主机 / 端口 / 是否 TLS
function 解析节点行(line) {
	const s = String(line || '').trim();
	if (!s) return null;
	if (/^https?:\/\//i.test(s)) return { kind: 'sub', name: s, host: '', port: 0 };
	const i = s.indexOf('://');
	if (i < 0) return { kind: 'other', name: s.slice(0, 60), host: '', port: 0 };
	const proto = s.slice(0, i).toLowerCase();
	const hash = s.indexOf('#');
	let name = '';
	if (hash > -1) { try { name = decodeURIComponent(s.slice(hash + 1)); } catch (e) { name = s.slice(hash + 1); } }

	if (proto === 'vmess') {
		const payload = (hash > -1 ? s.slice(i + 3, hash) : s.slice(i + 3)).trim();
		try {
			const o = JSON.parse(安全Base64解码(payload));
			const host = String(o.add || '').trim();
			const port = parseInt(o.port, 10) || 0;
			return { kind: 'node', name: o.ps || name || host, host, port, tls: String(o.tls || '').toLowerCase() === 'tls' };
		} catch (e) {
			return { kind: 'other', name: name || 'vmess(解析失败)', host: '', port: 0 };
		}
	}

	const m = s.match(/^[a-z0-9]+:\/\/(?:[^@\/]*@)?([^\/?#]+)/i);
	if (!m) return { kind: 'other', name: name || s.slice(0, 60), host: '', port: 0 };
	const hp = m[1].trim();
	const c = hp.lastIndexOf(':');
	const host = (c > -1 ? hp.slice(0, c) : hp).replace(/^\[|\]$/g, '');
	const port = c > -1 ? (parseInt(hp.slice(c + 1), 10) || 0) : 0;
	if (!host || !port) return { kind: 'other', name: name || host, host: '', port: 0 };

	// TLS 判定：优先看 security 参数，其次按端口推断
	const q = hash > -1 ? s.slice(i + 3, hash) : s.slice(i + 3);
	let tls;
	if (/[?&](security|tls)=tls/i.test(q)) tls = true;
	else if (/[?&](security|tls)=none/i.test(q)) tls = false;
	else tls = [443, 8443, 2053, 2083, 2087, 2096].includes(port);

	return { kind: 'node', name: name || (host + ':' + port), host, port, tls };
}

// 用一次 HTTP(S) 请求测往返耗时；只关心耗时，不关心状态码
async function 探测节点(host, port, tls, timeoutMs) {
	const target = (tls ? 'https' : 'http') + '://' + host + ':' + port + '/';
	const t0 = Date.now();
	const ctrl = new AbortController();
	const timer = setTimeout(() => { try { ctrl.abort(); } catch (e) { } }, timeoutMs || 4000);
	try {
		await fetch(target, {
			method: 'GET',
			redirect: 'manual',
			signal: ctrl.signal,
			headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CF-Workers-SUB-Ping/1.0)' },
		});
		return { ok: true, ms: Date.now() - t0 };
	} catch (e) {
		const msg = String((e && e.message) || '');
		const ms = Date.now() - t0;
		let err = '连接失败';
		if (e && e.name === 'AbortError') err = '超时';
		else if (msg.indexOf('1042') > -1 || msg.indexOf('same zone') > -1) err = '同区限制';
		else if (msg.indexOf('certificate') > -1 || msg.indexOf('TLS') > -1) err = '证书错误';
		else if (msg.indexOf('getaddrinfo') > -1 || msg.indexOf('DNS') > -1 || msg.indexOf('resolve') > -1) err = '域名解析失败';
		return { ok: false, ms, err };
	} finally {
		clearTimeout(timer);
	}
}

// 批量探测，返回 [{ line, ok, ms, err }]，line 为该行在原文中的下标
async function 批量测速(text) {
	const lines = String(text || '').split('\n');
	const 任务 = [];
	for (let i = 0; i < lines.length; i++) {
		const p = 解析节点行(lines[i]);
		if (p && p.kind === 'node' && p.host && p.port) 任务.push({ line: i, host: p.host, port: p.port, tls: p.tls });
	}
	const 待测 = 任务.slice(0, 40); // 免费版 Worker 单次请求上限 50 个子请求，留点余量
	const 结果 = [];
	const 并发 = 8;
	for (let i = 0; i < 待测.length; i += 并发) {
		const 批 = 待测.slice(i, i + 并发);
		const r = await Promise.all(批.map(t => 探测节点(t.host, t.port, t.tls, 4000)));
		for (let j = 0; j < 批.length; j++) 结果.push({ line: 批[j].line, ok: r[j].ok, ms: r[j].ms, err: r[j].err });
	}
	return 结果;
}

// 后台管理页面鉴权：通过返回 null，未通过返回 401 响应（触发浏览器弹窗）
function 后台鉴权(request) {
	if (!AdminPass) {
		return new Response('后台未启用：请先在 Cloudflare 变量中添加 ADMINPASS，再访问本页面', {
			status: 403,
			headers: { 'Content-Type': 'text/plain; charset=UTF-8', 'Cache-Control': 'no-store' },
		});
	}
	const auth = request.headers.get('Authorization') || '';
	if (auth.startsWith('Basic ')) {
		try {
			const bytes = Uint8Array.from(atob(auth.slice(6).trim()), c => c.charCodeAt(0));
			const decoded = new TextDecoder().decode(bytes); // 支持中文密码
			const idx = decoded.indexOf(':');
			if (idx > -1 && decoded.slice(0, idx) === AdminUser && decoded.slice(idx + 1) === AdminPass) return null;
		} catch (e) { }
	}
	return new Response('需要登录后才能访问后台', {
		status: 401,
		headers: {
			'WWW-Authenticate': `Basic realm="${FileName} Admin", charset="UTF-8"`,
			'Content-Type': 'text/plain; charset=UTF-8',
			'Cache-Control': 'no-store',
			'X-Admin-Build': '2026-10-17d',
		},
	});
}

async function KV(request, env, txt = 'ADD.txt') {
	const url = new URL(request.url);
	try {
		// POST请求处理
		if (request.method === "POST") {
			if (!env.KV) return new Response("未绑定KV空间", { status: 400 });
			try {
				const content = await request.text();
				await env.KV.put(txt, content);
				return new Response("保存成功");
			} catch (error) {
				console.error('保存KV时发生错误:', error);
				return new Response("保存失败: " + error.message, { status: 500 });
			}
		}

		// GET请求部分
		let content = '';
		let hasKV = !!env.KV;

		if (hasKV) {
			try {
				content = await env.KV.get(txt) || '';
			} catch (error) {
				console.error('读取KV时发生错误:', error);
				content = '读取数据时发生错误: ' + error.message;
			}
		}

		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>${FileName} 订阅编辑</title>
					<meta charset="utf-8">
					<meta name="viewport" content="width=device-width, initial-scale=1">
					<style>
						body {
							margin: 0;
							padding: 15px; /* 调整padding */
							box-sizing: border-box;
							font-size: 13px; /* 设置全局字体大小 */
						}
						.editor-container {
							width: 100%;
							max-width: 100%;
							margin: 0 auto;
						}
						.editor {
							width: 100%;
							height: 300px; /* 调整高度 */
							margin: 15px 0; /* 调整margin */
							padding: 10px; /* 调整padding */
							box-sizing: border-box;
							border: 1px solid #ccc;
							border-radius: 4px;
							font-size: 13px;
							line-height: 1.5;
							overflow-y: auto;
							resize: none;
						}
						.save-container {
							margin-top: 8px; /* 调整margin */
							display: flex;
							align-items: center;
							gap: 10px; /* 调整gap */
						}
						.save-btn, .back-btn {
							padding: 6px 15px; /* 调整padding */
							color: white;
							border: none;
							border-radius: 4px;
							cursor: pointer;
						}
						.save-btn {
							background: #4CAF50;
						}
						.save-btn:hover {
							background: #45a049;
						}
						.back-btn {
							background: #666;
						}
						.back-btn:hover {
							background: #555;
						}
						.save-status {
							color: #666;
						}

						.node-panel { margin-top: 18px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
						.panel-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
						.panel-head strong { font-size: 14px; color: #111827; }
						.panel-head .count { color: #6b7280; font-weight: normal; margin-left: 6px; }
						.table-wrap { max-height: 460px; overflow: auto; }
						#nodeTable { width: 100%; border-collapse: collapse; font-size: 12px; }
						#nodeTable th, #nodeTable td { padding: 6px 10px; border-bottom: 1px solid #f1f2f4; text-align: left; white-space: nowrap; }
						#nodeTable thead th { position: sticky; top: 0; background: #fff; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb; z-index: 1; }
						#nodeTable tbody tr:hover { background: #f9fafb; }
						.c-idx { color: #9ca3af; }
						.c-name { max-width: 260px; overflow: hidden; text-overflow: ellipsis; color: #111827; }
						.c-host { color: #4b5563; max-width: 240px; overflow: hidden; text-overflow: ellipsis; }
						.c-port { color: #4b5563; }
						.lat { font-variant-numeric: tabular-nums; color: #9ca3af; }
						.lat.good { color: #059669; font-weight: 600; }
						.lat.mid { color: #d97706; font-weight: 600; }
						.lat.bad { color: #dc2626; font-weight: 600; }
						#nodeTable thead th.sortable { cursor: pointer; user-select: none; }
						#nodeTable thead th.sortable:hover { background: #f3f4f6; color: #111827; }
						#nodeTable td.c-name { cursor: text; }
						.name-edit { width: 100%; box-sizing: border-box; font-size: 12px; padding: 2px 5px; border: 1px solid #2563eb; border-radius: 4px; outline: none; }
						.mini-btn { padding: 4px 10px; font-size: 12px; border: 1px solid #d1d5db; background: #fff; border-radius: 5px; cursor: pointer; color: #374151; }
						.mini-btn:hover { background: #f3f4f6; }
						.mini-btn:disabled { opacity: .6; cursor: default; }
						.mini-btn.primary { background: #2563eb; border-color: #2563eb; color: #fff; }
						.mini-btn.primary:hover { background: #1d4ed8; }
						.mini-btn.danger { color: #dc2626; border-color: #fecaca; }
						.mini-btn.danger:hover { background: #fef2f2; }
					</style>
					<script src="https://cdn.jsdelivr.net/npm/@keeex/qrcodejs-kx@1.0.2/qrcode.min.js"></script>
				</head>
				<body>
					################################################################<br>
					Subscribe / sub 订阅地址, 点击链接自动 <strong>复制订阅链接</strong> 并 <strong>生成订阅二维码</strong> <br>
					---------------------------------------------------------------<br>
					自适应订阅地址:<br>
					<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/${mytoken}?b64','qrcode_0')" style="color:blue;text-decoration:underline;cursor:pointer;">https://${url.hostname}/${mytoken}</a><br>
					<div id="qrcode_0" style="margin: 10px 10px 10px 10px;"></div>
					Base64订阅地址:<br>
					<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/${mytoken}?b64','qrcode_1')" style="color:blue;text-decoration:underline;cursor:pointer;">https://${url.hostname}/${mytoken}?b64</a><br>
					<div id="qrcode_1" style="margin: 10px 10px 10px 10px;"></div>
					clash订阅地址:<br>
					<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/${mytoken}?clash','qrcode_2')" style="color:blue;text-decoration:underline;cursor:pointer;">https://${url.hostname}/${mytoken}?clash</a><br>
					<div id="qrcode_2" style="margin: 10px 10px 10px 10px;"></div>
					singbox订阅地址:<br>
					<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/${mytoken}?sb','qrcode_3')" style="color:blue;text-decoration:underline;cursor:pointer;">https://${url.hostname}/${mytoken}?sb</a><br>
					<div id="qrcode_3" style="margin: 10px 10px 10px 10px;"></div>
					surge订阅地址:<br>
					<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/${mytoken}?surge','qrcode_4')" style="color:blue;text-decoration:underline;cursor:pointer;">https://${url.hostname}/${mytoken}?surge</a><br>
					<div id="qrcode_4" style="margin: 10px 10px 10px 10px;"></div>
					loon订阅地址:<br>
					<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/${mytoken}?loon','qrcode_5')" style="color:blue;text-decoration:underline;cursor:pointer;">https://${url.hostname}/${mytoken}?loon</a><br>
					<div id="qrcode_5" style="margin: 10px 10px 10px 10px;"></div>
					---------------------------------------------------------------<br>
					################################################################<br>
					订阅转换配置<br>
					---------------------------------------------------------------<br>
					SUBAPI（订阅转换后端）: <strong>${subProtocol}://${subConverter}</strong><br>
					SUBCONFIG（订阅转换配置文件）: <strong>${subConfig}</strong><br>
					---------------------------------------------------------------<br>
					################################################################<br>
					${FileName} 汇聚订阅编辑: 
					<div class="editor-container">
						${hasKV ? `
						<textarea class="editor" 
							placeholder="${decodeURIComponent(atob('TElOSyVFNyVBNCVCQSVFNCVCRSU4QiVFRiVCQyU4OCVFNCVCOCU4MCVFOCVBMSU4QyVFNCVCOCU4MCVFNCVCOCVBQSVFOCU4QSU4MiVFNyU4MiVCOSVFOSU5MyVCRSVFNiU4RSVBNSVFNSU4RCVCMyVFNSU4RiVBRiVFRiVCQyU4OSVFRiVCQyU5QQp2bGVzcyUzQSUyRiUyRjI0NmFhNzk1LTA2MzctNGY0Yy04ZjY0LTJjOGZiMjRjMWJhZCU0MDEyNy4wLjAuMSUzQTEyMzQlM0ZlbmNyeXB0aW9uJTNEbm9uZSUyNnNlY3VyaXR5JTNEdGxzJTI2c25pJTNEVEcuQ01MaXVzc3NzLmxvc2V5b3VyaXAuY29tJTI2YWxsb3dJbnNlY3VyZSUzRDElMjZ0eXBlJTNEd3MlMjZob3N0JTNEVEcuQ01MaXVzc3NzLmxvc2V5b3VyaXAuY29tJTI2cGF0aCUzRCUyNTJGJTI1M0ZlZCUyNTNEMjU2MCUyM0NGbmF0CnRyb2phbiUzQSUyRiUyRmFhNmRkZDJmLWQxY2YtNGE1Mi1iYTFiLTI2NDBjNDFhNzg1NiU0MDIxOC4xOTAuMjMwLjIwNyUzQTQxMjg4JTNGc2VjdXJpdHklM0R0bHMlMjZzbmklM0RoazEyLmJpbGliaWxpLmNvbSUyNmFsbG93SW5zZWN1cmUlM0QxJTI2dHlwZSUzRHRjcCUyNmhlYWRlclR5cGUlM0Rub25lJTIzSEsKc3MlM0ElMkYlMkZZMmhoWTJoaE1qQXRhV1YwWmkxd2IyeDVNVE13TlRveVJYUlFjVzQyU0ZscVZVNWpTRzlvVEdaVmNFWlJkMjVtYWtORFVUVnRhREZ0U21SRlRVTkNkV04xVjFvNVVERjFaR3RTUzBodVZuaDFielUxYXpGTFdIb3lSbTgyYW5KbmRERTRWelkyYjNCMGVURmxOR0p0TVdwNlprTm1RbUklMjUzRCU0MDg0LjE5LjMxLjYzJTNBNTA4NDElMjNERQoKCiVFOCVBRSVBMiVFOSU5OCU4NSVFOSU5MyVCRSVFNiU4RSVBNSVFNyVBNCVCQSVFNCVCRSU4QiVFRiVCQyU4OCVFNCVCOCU4MCVFOCVBMSU4QyVFNCVCOCU4MCVFNiU5RCVBMSVFOCVBRSVBMiVFOSU5OCU4NSVFOSU5MyVCRSVFNiU4RSVBNSVFNSU4RCVCMyVFNSU4RiVBRiVFRiVCQyU4OSVFRiVCQyU5QQpodHRwcyUzQSUyRiUyRnN1Yi54Zi5mcmVlLmhyJTJGYXV0bw=='))}"
							id="content">${content}</textarea>
						<div class="save-container">
							<button class="save-btn" onclick="saveContent(this)">保存</button>
							<span class="save-status" id="saveStatus"></span>
						</div>

						<div class="node-panel">
							<div class="panel-head">
								<strong>节点列表<span class="count" id="nodeCount">0</span></strong>
								<div>
									<button class="mini-btn" onclick="renderTable()">刷新</button>
									<button class="mini-btn primary" onclick="pingAll(this)">测试全部</button>
								</div>
							</div>
							<div class="table-wrap">
								<table id="nodeTable">
									<thead>
										<tr><th>#</th><th>备注</th><th>协议</th><th>地址</th><th>端口</th><th id="thLat" class="sortable" onclick="sortByLatency()" title="点击按延迟排序，再点反向，第三次恢复原序">延迟</th><th>操作</th></tr>
									</thead>
									<tbody id="nodeBody"></tbody>
								</table>
							</div>
						</div>
						` : '<p>请绑定 <strong>变量名称</strong> 为 <strong>KV</strong> 的KV命名空间</p>'}
					</div>
					<br>
					################################################################<br>
					${decodeURIComponent(atob('dGVsZWdyYW0lMjAlRTQlQkElQTQlRTYlQjUlODElRTclQkUlQTQlMjAlRTYlOEElODAlRTYlOUMlQUYlRTUlQTQlQTclRTQlQkQlQUMlN0UlRTUlOUMlQTglRTclQkElQkYlRTUlOEYlOTElRTclODklOEMhJTNDYnIlM0UKJTNDYSUyMGhyZWYlM0QlMjdodHRwcyUzQSUyRiUyRnQubWUlMkZDTUxpdXNzc3MlMjclM0VodHRwcyUzQSUyRiUyRnQubWUlMkZDTUxpdXNzc3MlM0MlMkZhJTNFJTNDYnIlM0UKLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tJTNDYnIlM0UKZ2l0aHViJTIwJUU5JUExJUI5JUU3JTlCJUFFJUU1JTlDJUIwJUU1JTlEJTgwJTIwU3RhciFTdGFyIVN0YXIhISElM0NiciUzRQolM0NhJTIwaHJlZiUzRCUyN2h0dHBzJTNBJTJGJTJGZ2l0aHViLmNvbSUyRmNtbGl1JTJGQ0YtV29ya2Vycy1TVUIlMjclM0VodHRwcyUzQSUyRiUyRmdpdGh1Yi5jb20lMkZjbWxpdSUyRkNGLVdvcmtlcnMtU1VCJTNDJTJGYSUzRSUzQ2JyJTNFCi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSUzQ2JyJTNFCiUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMw=='))}
					<br><br>UA: <strong>${request.headers.get('User-Agent')}</strong> · 构建 <strong>2026-10-17d</strong>
					<script>
					function copyToClipboard(text, qrcode) {
						navigator.clipboard.writeText(text).then(() => {
							alert('已复制到剪贴板');
						}).catch(err => {
							console.error('复制失败:', err);
						});
						const qrcodeDiv = document.getElementById(qrcode);
						qrcodeDiv.innerHTML = '';
						new QRCode(qrcodeDiv, {
							text: text,
							width: 220, // 调整宽度
							height: 220, // 调整高度
							colorDark: "#000000", // 二维码颜色
							colorLight: "#ffffff", // 背景颜色
							correctLevel: QRCode.CorrectLevel.Q, // 设置纠错级别
							scale: 1 // 调整像素颗粒度
						});
					}
						
					if (document.querySelector('.editor')) {
						let timer;
						const textarea = document.getElementById('content');
						const originalContent = textarea.value;
		
						function goBack() {
							const currentUrl = window.location.href;
							const parentUrl = currentUrl.substring(0, currentUrl.lastIndexOf('/'));
							window.location.href = parentUrl;
						}
		
						function replaceFullwidthColon() {
							const text = textarea.value;
							textarea.value = text.replace(/：/g, ':');
						}
						
						function saveContent(button) {
							try {
								const updateButtonText = (step) => {
									button.textContent = \`保存中: \${step}\`;
								};
								// 检测是否为iOS设备
								const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
								
								// 仅在非iOS设备上执行replaceFullwidthColon
								if (!isIOS) {
									replaceFullwidthColon();
								}
								updateButtonText('开始保存');
								button.disabled = true;

								// 获取textarea内容和原始内容
								const textarea = document.getElementById('content');
								if (!textarea) {
									throw new Error('找不到文本编辑区域');
								}

								updateButtonText('获取内容');
								let newContent;
								let originalContent;
								try {
									newContent = textarea.value || '';
									originalContent = textarea.defaultValue || '';
								} catch (e) {
									console.error('获取内容错误:', e);
									throw new Error('无法获取编辑内容');
								}

								updateButtonText('准备状态更新函数');
								const updateStatus = (message, isError = false) => {
									const statusElem = document.getElementById('saveStatus');
									if (statusElem) {
										statusElem.textContent = message;
										statusElem.style.color = isError ? 'red' : '#666';
									}
								};

								updateButtonText('准备按钮重置函数');
								const resetButton = () => {
									button.textContent = '保存';
									button.disabled = false;
								};

								if (newContent !== originalContent) {
									updateButtonText('发送保存请求');
									fetch(window.location.href, {
										method: 'POST',
										body: newContent,
										headers: {
											'Content-Type': 'text/plain;charset=UTF-8'
										},
										cache: 'no-cache'
									})
									.then(response => {
										updateButtonText('检查响应状态');
										if (!response.ok) {
											throw new Error(\`HTTP error! status: \${response.status}\`);
										}
										updateButtonText('更新保存状态');
										const now = new Date().toLocaleString();
										document.title = \`编辑已保存 \${now}\`;
										updateStatus(\`已保存 \${now}\`);
									})
									.catch(error => {
										updateButtonText('处理错误');
										console.error('Save error:', error);
										updateStatus(\`保存失败: \${error.message}\`, true);
									})
									.finally(() => {
										resetButton();
									});
								} else {
									updateButtonText('检查内容变化');
									updateStatus('内容未变化');
									resetButton();
								}
							} catch (error) {
								console.error('保存过程出错:', error);
								button.textContent = '保存';
								button.disabled = false;
								const statusElem = document.getElementById('saveStatus');
								if (statusElem) {
									statusElem.textContent = \`错误: \${error.message}\`;
									statusElem.style.color = 'red';
								}
							}
						}
		
						textarea.addEventListener('blur', saveContent);
						textarea.addEventListener('input', () => {
							clearTimeout(timer);
							timer = setTimeout(saveContent, 5000);
						});

						// ===== 节点列表 / 测速 / 删除 =====
						var NL = String.fromCharCode(10);
						var latCache = {};   // 以节点链接原文为 key 缓存延迟，删除/排序/重渲染都不会丢
						var sortKey = '';    // '' = 原始顺序；'lat' = 按延迟排
						var sortDir = 1;     // 1 = 升序，-1 = 降序

						function parseLine(line) {
							var s = (line || '').trim();
							if (!s) return null;
							var i = s.indexOf('://');
							if (i < 0) return { kind: 'other', proto: '?', name: s.slice(0, 60), host: '', port: '' };
							var proto = s.slice(0, i).toLowerCase();
							if (proto === 'http' || proto === 'https') return { kind: 'sub', proto: '订阅', name: s, host: '', port: '' };
							var hash = s.indexOf('#');
							var name = hash > -1 ? s.slice(hash + 1) : '';
							try { name = decodeURIComponent(name); } catch (e) { }
							var body = hash > -1 ? s.slice(0, hash) : s;
							if (proto === 'vmess') return { kind: 'node', proto: proto, name: name || 'vmess', host: '', port: '' };
							var after = body.slice(i + 3);
							var at = after.indexOf('@');
							var hp = at > -1 ? after.slice(at + 1) : after;
							var q = hp.indexOf('?');
							if (q > -1) hp = hp.slice(0, q);
							var sl = hp.indexOf('/');
							if (sl > -1) hp = hp.slice(0, sl);
							var c = hp.lastIndexOf(':');
							var host = c > -1 ? hp.slice(0, c) : hp;
							var port = c > -1 ? hp.slice(c + 1) : '';
							return { kind: 'node', proto: proto, name: name || (host + ':' + port), host: host, port: port };
						}

						function latClass(ms) {
							return 'lat ' + (ms < 200 ? 'good' : (ms < 600 ? 'mid' : 'bad'));
						}

						function latOf(line) {
							var c = latCache[(line || '').trim()];
							if (c && c.ok) return c.ms;
							return null;
						}

						function renderTable() {
							var tb = document.getElementById('nodeBody');
							var ta = document.getElementById('content');
							if (!tb || !ta) return;
							var lines = ta.value.split(NL);
							var rows = [];
							for (var i = 0; i < lines.length; i++) {
								var p = parseLine(lines[i]);
								if (!p) continue;
								rows.push({ line: i, p: p });
							}
							if (sortKey === 'lat') {
								rows.sort(function (a, b) {
									var va = latOf(lines[a.line]);
									var vb = latOf(lines[b.line]);
									if (va === null && vb === null) return a.line - b.line;
									if (va === null) return 1;
									if (vb === null) return -1;
									return (va - vb) * sortDir;
								});
							}
							tb.textContent = '';
							for (var k = 0; k < rows.length; k++) {
								var ln = rows[k].line;
								var row = rows[k].p;
								var tr = document.createElement('tr');

								var c1 = document.createElement('td');
								c1.className = 'c-idx';
								c1.textContent = String(k + 1);
								tr.appendChild(c1);

								var c2 = document.createElement('td');
								c2.className = 'c-name';
								c2.textContent = row.name;
								c2.setAttribute('data-line', String(ln));
								if (row.kind === 'sub') {
									c2.title = lines[ln];
								} else {
									c2.title = '双击可修改备注';
									c2.ondblclick = function () { startEditName(this); };
								}
								tr.appendChild(c2);

								var c3 = document.createElement('td');
								c3.textContent = row.proto;
								tr.appendChild(c3);

								var c4 = document.createElement('td');
								c4.className = 'c-host';
								var shown = row.kind === 'sub' ? row.name : row.host;
								c4.textContent = shown.length > 40 ? shown.slice(0, 40) + '...' : shown;
								c4.title = shown;
								tr.appendChild(c4);

								var c5 = document.createElement('td');
								c5.className = 'c-port';
								c5.textContent = row.port || '-';
								tr.appendChild(c5);

								var c6 = document.createElement('td');
								c6.className = 'lat';
								c6.id = 'lat-' + ln;
								var cached = latCache[(lines[ln] || '').trim()];
								if (cached) {
									if (cached.ok) {
										c6.textContent = cached.ms + ' ms';
										c6.className = latClass(cached.ms);
									} else {
										c6.textContent = cached.err || '失败';
										c6.className = 'lat bad';
									}
								} else {
									c6.textContent = (row.kind === 'node' && row.host) ? '未测' : '-';
								}
								tr.appendChild(c6);

								var c7 = document.createElement('td');
								var btn = document.createElement('button');
								btn.className = 'mini-btn danger';
								btn.textContent = '删除';
								btn.setAttribute('data-line', String(ln));
								btn.onclick = function () { delNode(this); };
								c7.appendChild(btn);
								tr.appendChild(c7);

								tb.appendChild(tr);
							}
							var cnt = document.getElementById('nodeCount');
							if (cnt) cnt.textContent = String(rows.length);
							updateSortIndicator();
						}

						// 点表头：升序 → 降序 → 恢复原始顺序
						function sortByLatency() {
							if (sortKey !== 'lat') { sortKey = 'lat'; sortDir = 1; }
							else if (sortDir === 1) { sortDir = -1; }
							else { sortKey = ''; sortDir = 1; }
							renderTable();
						}

						function updateSortIndicator() {
							var th = document.getElementById('thLat');
							if (!th) return;
							th.textContent = '延迟' + (sortKey === 'lat' ? (sortDir === 1 ? ' ▲' : ' ▼') : '');
						}
						// 双击备注名 → 就地编辑
						function startEditName(td) {
							if (td.querySelector('input')) return;
							var ln = parseInt(td.getAttribute('data-line'), 10);
							var ta = document.getElementById('content');
							var lines = ta.value.split(NL);
							var raw = lines[ln] || '';
							var hash = raw.indexOf('#');
							var oldName = hash > -1 ? raw.slice(hash + 1) : '';
							try { oldName = decodeURIComponent(oldName); } catch (e) { }

							var input = document.createElement('input');
							input.type = 'text';
							input.className = 'name-edit';
							input.value = oldName;
							td.textContent = '';
							td.appendChild(input);
							input.focus();
							input.select();

							var done = false;
							function commit(save) {
								if (done) return;
								done = true;
								if (!save) { renderTable(); return; }
								applyRename(ln, input.value.trim());
							}
							input.addEventListener('keydown', function (e) {
								if (e.key === 'Enter') { e.preventDefault(); commit(true); }
								else if (e.key === 'Escape') { e.preventDefault(); commit(false); }
							});
							input.addEventListener('blur', function () { commit(true); });
						}

						// 把新备注写回文本框对应行，立即保存
						function applyRename(ln, newName) {
							var ta = document.getElementById('content');
							var lines = ta.value.split(NL);
							var old = lines[ln];
							if (old === undefined) { renderTable(); return; }
							var hash = old.indexOf('#');
							var base = hash > -1 ? old.slice(0, hash) : old;
							var newLine = newName ? (base + '#' + encodeURIComponent(newName)) : base;
							if (newLine === old) { renderTable(); return; }
							lines[ln] = newLine;
							var kOld = old.trim();
							var kNew = newLine.trim();
							if (latCache[kOld]) { latCache[kNew] = latCache[kOld]; delete latCache[kOld]; }
							ta.value = lines.join(NL);
							renderTable();
							saveRaw(ta.value);
						}

						function saveRaw(content) {
							return fetch(location.pathname, {
								method: 'POST',
								headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
								body: content,
								cache: 'no-store'
							}).then(function (r) {
								if (!r.ok) throw new Error('HTTP ' + r.status);
								var st = document.getElementById('saveStatus');
								if (st) { st.textContent = '已保存 ' + new Date().toLocaleTimeString(); st.style.color = '#666'; }
							}).catch(function (e) {
								var st = document.getElementById('saveStatus');
								if (st) { st.textContent = '保存失败: ' + e.message; st.style.color = 'red'; }
							});
						}

						function delNode(btn) {
							var idx = parseInt(btn.getAttribute('data-line'), 10);
							var ta = document.getElementById('content');
							var lines = ta.value.split(NL);
							var p = parseLine(lines[idx]);
							if (!confirm('确定删除这条？' + NL + NL + (p ? p.name : lines[idx]))) return;
							lines.splice(idx, 1);
							ta.value = lines.join(NL);
							renderTable();
							saveRaw(ta.value);
						}

						function pingAll(btn) {
							var ta = document.getElementById('content');
							var old = btn.textContent;
							btn.disabled = true;
							btn.textContent = '测试中...';
							var cells = document.querySelectorAll('#nodeBody .lat');
							for (var i = 0; i < cells.length; i++) { cells[i].textContent = '...'; cells[i].className = 'lat'; }
							fetch(location.pathname + '?api=ping', {
								method: 'POST',
								headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
								body: ta.value,
								cache: 'no-store'
							}).then(function (r) {
								if (!r.ok) throw new Error('HTTP ' + r.status);
								return r.json();
							}).then(function (list) {
								var lines = ta.value.split(NL);
								for (var k = 0; k < list.length; k++) {
									var it = list[k];
									var raw = lines[it.line];
									if (raw === undefined) continue;
									latCache[raw.trim()] = { ok: it.ok, ms: it.ms, err: it.err };
								}
								renderTable();
							}).catch(function (e) {
								alert('测试失败: ' + e.message);
							}).then(function () {
								btn.disabled = false;
								btn.textContent = old;
							});
						}

						window.renderTable = renderTable;
						window.sortByLatency = sortByLatency;
						window.pingAll = pingAll;
						window.delNode = delNode;

						renderTable();
						document.getElementById('content').addEventListener('input', function () {
							clearTimeout(window.__rt);
							window.__rt = setTimeout(renderTable, 400);
						});
					}
					</script>
				</body>
			</html>
		`;

		return new Response(html, {
			headers: {
				"Content-Type": "text/html;charset=utf-8",
				"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
				"Pragma": "no-cache",
				"Expires": "0",
				"X-Admin-Build": "2026-10-17d"
			}
		});
	} catch (error) {
		console.error('处理请求时发生错误:', error);
		return new Response("服务器错误: " + error.message, {
			status: 500,
			headers: { "Content-Type": "text/plain;charset=utf-8" }
		});
	}
}
