# webpack 文件远程部署插件
webpack文件部署插件，将文件推送到服务器。

## 安装
npm install --save-dev webpack-upload-remote-plugin

## 使用方法
在webpack.plugin中配置

```js
const UploadRemotePlugin = require('webpack-upload-remote-plugin');
...
{
    plugins: [
        new UploadRemotePlugin({
            receiver: 'http://x.x.x.x:port/receiver',
            parallel: false,
            rules: [
                {
                    from: /(asset|static)\/.+/,
                    to: '/home/work/static'
                },
                {
                    from: /template\/.+/,
                    to: '/home/work/template'
                }
            ]
        })
    ]
}
...
```

## 参数说明
- receiver：必填；远端接收脚本；提供php版本：./receiver.php；
- parallel：非必填；默认为true，文件并行推送；若为false，则为串行推送，一个成功之后推送下一个；
- rules.from：必填；构建产物静态资源路径的正则表达式；
- rules.to：必填；服务器端接收绝对路径；

## 特殊说明
- 推送过程中支持重试机制，默认重试10次；
- 提供了 receiver.php 脚本，用于服务端接收文件；
- 请确保服务端相应目录有接收权限；
- 确保http各项配置满足要求，如：client_max_body_size： 8M；具体大小根据项目静态文件大小自定；

## Keywords
webpack plugin remote upload http server
