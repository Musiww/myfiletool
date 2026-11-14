# myfiletool · 轻轻工具

[English](README.md) · **简体中文**

myfiletool 是一个在浏览器里处理图片和 PDF 的轻量工具。我做它的起点很简单：有些文件包含个人信息，我不放心把它们上传到不了解其处理方式的在线转换网站，所以想做一个自己能查看代码、自己部署和使用的工具。

文件在浏览器里处理。应用没有上传文件的接口、用户账户或保存文件的数据库。刷新页面后，当前队列和结果会清空。浏览器只保存所选的界面语言。网站托管方仍可能记录普通访问，下载后的文件由浏览器和设备管理。具体边界见[隐私与安全说明](docs/PRIVACY.md)。

## 目前支持

- 压缩、调整 JPEG、PNG、静态 WebP 图片尺寸，并导出为 JPEG、PNG 或 WebP。PNG 为无损格式，没有质量滑块。
- 将 PDF 每页导出为一张图片。页码留空表示全部，也可填单页 `3`、范围 `3-5` 或组合 `1,3-5`。
- 拖拽导入、预览原图与结果、修改输出文件名、搜索筛选、选择文件、单独下载、将所选结果打包为 ZIP，以及清空会话。
- 英文、简体中文和繁体中文界面切换。

第一版保持轻量，后续会继续加入实用的本地文件工具。欢迎提出建议。如果你喜欢这个项目，也可以 fork 代码，把它部署到自己的网站上自己使用。

## 本地运行

建议使用 Node.js 24，版本配置见 [.nvmrc](.nvmrc)。在项目根目录运行：

```powershell
npm ci
npm run dev
```

打开终端显示的本地地址。检查正式构建时运行：

```powershell
npm run build
npm run preview
```

## 检查

```powershell
npm test
npm run typecheck
npm run build
```

浏览器测试使用生成的示例文件。测试范围和限制见[测试说明](docs/TESTING.md)。

```powershell
npm run fixtures
npx playwright install chromium
npm run test:e2e
```

## 部署自己的版本

本项目可作为静态网站部署到 Cloudflare Pages。将自己的 GitHub 仓库连接至 Pages，生产分支选择 `main`，构建命令填 `npm run build`，输出目录填 `dist`。项目的 [.nvmrc](.nvmrc) 指定 Node.js 24。使用独立域名或子域名时，Vite 的默认根路径 `/` 即可。首次构建成功后，在 Pages 项目的 Custom domains 中添加域名。具体操作及 GitHub Pages 备选方案见[部署文档](docs/DEPLOYMENT.md)。

公开仓库前请检查待提交文件，不要把真实证件、私人文档或处理结果提交进去。[.gitignore](.gitignore) 已排除依赖、构建产物和本地输入输出文件夹。

## 技术与来源

界面使用 React、TypeScript 和 Vite；图片由浏览器 Canvas 处理，PDF 使用随网站部署的 Mozilla PDF.js 渲染，ZIP 在浏览器本地生成。界面根据本项目需求设计，没有复制某个产品的页面或模板。本项目代码采用 [MIT 许可证](LICENSE)，第三方依赖保留各自的许可证，部署时 PDF.js 资源会附带其 Apache 2.0 许可证。更多信息见[架构说明](docs/ARCHITECTURE.md)、[原始设计](DESIGN.md)和[后续规划](docs/ROADMAP.md)。
