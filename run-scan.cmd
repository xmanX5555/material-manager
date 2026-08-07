@echo off
cd /d "e:\学校\实习\京东3c面试准备\material-manager"
node server/batch-tag.js --module=meigong --filter=椅子,椅,交椅,圈椅,官帽椅,太师椅,靠椅,木椅 --scan-tag --concurrency=3
pause
