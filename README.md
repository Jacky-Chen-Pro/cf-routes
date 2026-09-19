# routes

`routes.json` 是一份带数字签名的入口列表，供客户端在常规渠道都失效时读取。

- 只改 `routes.source.json`，然后运行 `node sign.mjs` 生成 `routes.json`，提交并推送。
- `node sign.mjs --verify` 校验现有的 `routes.json`。
- 签名私钥不在本仓库。没有私钥生成的 `routes.json` 客户端不会采信。
