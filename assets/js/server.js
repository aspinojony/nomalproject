const express = require('express');
const crypto = require('crypto');
const { format } = require('date-fns');         // ✅ 修正拼写错误
const { utcToZonedTime } = require('date-fns-tz'); // ✅ 修正拼写错误

const app = express();
const port = 3001;

// === 请把你真实的讯飞信息填写在这里 ===
const config = {
  appId: 'a4724c72',
  apiKey: '99ab6bc275204dcf325a42e84ec25ada',
  apiSecret: 'YjE5MzE4ZTI3MWM3NTQ2MDRkYWRiM2Y0',
  host: 'spark-api.xf-yun.com',
  path: '/v1.1/chat'
};

function getAuthUrl() {
  const { apiKey, apiSecret, host, path } = config;
  const date = format(utcToZonedTime(new Date(), 'GMT'), 'EEE, dd MMM yyyy HH:mm:ss \'GMT\'', { timeZone: 'GMT' });

  const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;
  const signatureSha = crypto.createHmac('sha256', apiSecret)
    .update(signatureOrigin)
    .digest();
  const signature = Buffer.from(signatureSha).toString('base64');

  const authorizationOrigin = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
  const authorization = Buffer.from(authorizationOrigin).toString('base64');

  const url = `wss://${host}${path}?authorization=${encodeURIComponent(authorization)}&date=${encodeURIComponent(date)}&host=${host}`;
  return url;
}

app.get('/ws-auth-url', (req, res) => {
  try {
    const url = getAuthUrl();
    res.json({
      appid: config.appId,
      url
    });
  } catch (err) {
    console.error('签名生成失败:', err);
    res.status(500).send('签名生成失败');
  }
});

app.listen(port, () => {
  console.log(`✅ 讯飞签名服务运行中：http://localhost:${port}/ws-auth-url`);
});
