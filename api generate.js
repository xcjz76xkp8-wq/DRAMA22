import crypto from 'crypto';

export default async function handler(req, res) {
  const { prompt } = req.body;

  // 你的所有密钥，已完整填入
  const deepseekKey = "sk-ecadf3244d5445af88282f2defa5ed30";
  const jimengAccessKey = "AKLTMWWRiMzM3Y2Y4N2Q5NGFhYThiZTM4ODE4NWJiZTJkZmU";
  const jimengSecretKey = "WW1aaVpEZ3paV1kyWIdNd05HWTFOamcxTkRJek1qaGINV1E1WkRBMk1ERQ==";

  try {
    // 第一步：调用DeepSeek生成短剧剧本
    const scriptResp = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${deepseekKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.6,
        stream: false
      })
    });

    const scriptData = await scriptResp.json();
    if (scriptData.error) throw new Error(`DeepSeek错误: ${scriptData.error.message}`);
    const script = scriptData.choices?.[0]?.message?.content || "剧本生成失败";

    // 第二步：即梦AI标准HMAC-SHA256签名（符合官方规范）
    const timestamp = Date.now().toString();
    const nonce = crypto.randomBytes(16).toString("hex");
    const stringToSign = `AccessKey=${jimengAccessKey}&Timestamp=${timestamp}&Nonce=${nonce}`;
    
    const signature = crypto
      .createHmac("sha256", jimengSecretKey)
      .update(stringToSign)
      .digest("base64");

    // 第三步：调用即梦AI生成竖屏短剧视频
    const videoResp = await fetch("https://api.aimj.cn/v1/videos/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "AccessKey": jimengAccessKey,
        "Timestamp": timestamp,
        "Nonce": nonce,
        "Signature": signature
      },
      body: JSON.stringify({
        script: script,
        aspect_ratio: "9:16",
        duration: 50,
        voice: "zh-CN-XiaoxiaoNeural",
        resolution: "1080x1920"
      })
    });

    const videoResult = await videoResp.json();
    res.status(200).json({
      script: script,
      video: videoResult
    });

  } catch (err) {
    res.status(500).json({
      error: err.message,
      tip: "若视频生成失败，请检查即梦AI接口地址/权限/余额"
    });
  }
}