import {defineConfig} from "vite";
import {fileURLToPath} from "node:url";
const here=(p:string)=>fileURLToPath(new URL(p,import.meta.url));
export default defineConfig({root:here("./"),base:"./",publicDir:here("../public/"),esbuild:{jsx:"automatic"},css:{postcss:{plugins:[]}},build:{outDir:here("../dist-pages/"),emptyOutDir:true}});
