class FileProcess {
  constructor(lib, inputs, elms) {
    this.fs = lib.fs;
    this.jsObf = lib.jsObf;

    this.fromDir = inputs.fromDir;
    this.toDir = inputs.toDir;
    this.onlyUpdated = inputs.onlyUpdated;
    this.onlyJs = inputs.onlyJs;

    this.submitProg = elms.submitProg;
    this.resultCon = elms.resultCon;

    this.dirsToPrc = [this.fromDir]; // push된 폴더가 처리되고 pop되는 곳
    this.prcDirInterval;
    this.procFileCount = 0;

    this.init();
  }
}

let submitProg = document.querySelector('.submitProgress');

FileProcess.prototype.init = function () {
  const fp = this;

  while (fp.resultCon.hasChildNodes()) {
    fp.resultCon.removeChild(fp.resultCon.lastChild);
  }

  fp.prcDirInterval = setInterval(() => {
    fp.processDirs();
    if (fp.dirsToPrc.length === 0) {
      clearInterval(fp.prcDirInterval);
      fp.submitProg.innerHTML = '-- 완료 --' + fp.procFileCount + '개 파일을 처리했습니다.';
    }
  }, 0)
}

// 모든 내부 폴더들을 처리
FileProcess.prototype.processDirs = function () {
    const fp = this;
    let dirToPrc = fp.dirsToPrc.pop();
    fp.fs.readdirSync(dirToPrc).forEach((inDir) => {
      let indName = dirToPrc + '/' + inDir;
      if (fp.fs.lstatSync(indName).isDirectory()) {
        fp.dirsToPrc.push(indName);
      } else {
        if (!fp.onlyJs || inDir.slice(-3) === '.js') {
          fp.obfuscate(dirToPrc.replace(fp.fromDir, ''), inDir);
        }
      }
    });
}

// 입력 폴더의 js파일들을 출력 폴더로 처리
FileProcess.prototype.obfuscate = function (dirPath, fileName) {
  const fp = this;
  let toDir = (fp.toDir + dirPath);
  let toFullPath = toDir + '/' + fileName;
  let fromFullPath = fp.fromDir + dirPath + '/' + fileName;

  if (fp.onlyUpdated && fp.fs.existsSync(toFullPath)) {
    if (fileName.slice(-3) === '.js') {
      // 자바스크립트면 수정일이 같아도 난독화
      if (fp.fs.statSync(fromFullPath).mtime < fp.fs.statSync(toFullPath).mtime) return;
    } else {
      // 자바스크립트가 아니면 난독화 할 필요 없으므로 새로 복사할 필요 없음
      if (fp.fs.statSync(fromFullPath).mtime <= fp.fs.statSync(toFullPath).mtime) return;
    }
  }

  fp.fs.ensureDirSync(toDir);
  fp.fs.removeSync(toFullPath);
  if (fileName.slice(-3) === '.js') {
    try {
      fp.fs.writeFileSync(
        toFullPath, 
        fp.jsObf.obfuscate(
          fp.fs.readFileSync(fromFullPath)
        ).getObfuscatedCode()
      );
      fp.addResult('[난독] ' + toFullPath, 'lime');
    } catch (e) {
      // 난독화 살패: 이미 난독화된 js파일 등
      console.log(e);
      fp.fs.copySync(fromFullPath, toFullPath);
      fp.addResult('[난독실패-복사] ' + toFullPath, 'salmon');
    }
  } else {
    fp.fs.copySync(fromFullPath, toFullPath);
    fp.addResult('[복사] ' + toFullPath);
  }

  fp.procFileCount++;
  fp.submitProg.innerHTML = '[처리중] ' + fp.procFileCount + '개 파일 완료...';
}

FileProcess.prototype.addResult = function (text, color) {
  let div = document.createElement('DIV');
  div.className += color;
  div.appendChild(document.createTextNode(text));
  this.resultCon.appendChild(div);
}

module.exports = FileProcess;