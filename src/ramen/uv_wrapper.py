"""
UV Package Manager - 優雅的 subprocess 封裝
uv 是用 Rust 編寫的獨立 CLI 工具，沒有 Python API
這個模組提供類型安全的封裝層，包含錯誤處理和日誌
"""

import subprocess
import sys
import os
import logging
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

from ramen.commons import Singleton


logger = logging.getLogger(__name__)


class UVCommand(Enum):
    """UV 命令列表"""
    VERSION = "version"
    VENV = "venv"
    PIP_INSTALL = "pip_install"
    PIP_UNINSTALL = "pip_uninstall"
    PIP_LIST = "pip_list"
    PIP_SYNC = "pip_sync"
    PIP_FREEZE = "pip_freeze"
    RUN = "run"
    ADD = "add"
    REMOVE = "remove"
    SYNC = "sync"


@dataclass
class PackageInfo:
    """套件資訊"""
    name: str
    version: str
    location: Optional[str] = None


@dataclass
class EnvironmentInfo:
    """環境資訊"""
    python_version: str
    venv_path: Optional[Path] = None
    is_venv_active: bool = False
    uv_version: Optional[str] = None


@dataclass
class UVResult:
    """UV 命令執行結果"""
    success: bool
    stdout: str = ""
    stderr: str = ""
    returncode: int = 0

    @property
    def output(self) -> str:
        """取得輸出（優先 stdout，失敗時返回 stderr）"""
        return self.stdout if self.success else self.stderr


class UVPackageManager(metaclass=Singleton):
    """
    UV 套件管理器
    封裝 uv CLI 工具，提供 Python 友善的介面

    注意：uv 是 Rust 編寫的獨立工具，不是 Python 套件
    這個類別透過 subprocess 與 uv CLI 互動
    """

    def __init__(self):
        if hasattr(self, '_initialized'):
            return
        self._initialized = True
        self._uv_available: Optional[bool] = None
        self._venv_path: Optional[Path] = None
        self._uv_binary: str = "uv"  # 可配置 uv 執行檔路徑

    def _run_uv_command(
        self,
        args: List[str],
        cwd: Optional[Path] = None,
        env: Optional[Dict[str, str]] = None,
        timeout: int = 300,
        capture_output: bool = True
    ) -> UVResult:
        """
        執行 uv 命令（內部方法）

        Args:
            args: 命令參數列表
            cwd: 工作目錄
            env: 環境變數
            timeout: 超時時間（秒）
            capture_output: 是否捕獲輸出

        Returns:
            UVResult 物件
        """
        full_cmd = [self._uv_binary] + args

        logger.debug(f"執行 UV 命令: {' '.join(full_cmd)}")

        try:
            result = subprocess.run(
                full_cmd,
                capture_output=capture_output,
                text=True,
                cwd=cwd,
                env=env,
                timeout=timeout
            )

            success = result.returncode == 0

            if not success:
                logger.warning(f"UV 命令失敗 (code {result.returncode}): {result.stderr}")

            return UVResult(
                success=success,
                stdout=result.stdout,
                stderr=result.stderr,
                returncode=result.returncode
            )

        except subprocess.TimeoutExpired:
            logger.error(f"UV 命令超時 ({timeout}s): {' '.join(full_cmd)}")
            return UVResult(
                success=False,
                stderr=f"Command timeout after {timeout} seconds"
            )
        except FileNotFoundError:
            logger.error("UV 執行檔未找到，請確認 uv 已安裝並在 PATH 中")
            return UVResult(
                success=False,
                stderr="UV binary not found. Please install uv first."
            )
        except Exception as e:
            logger.error(f"執行 UV 命令時發生錯誤: {e}")
            return UVResult(
                success=False,
                stderr=f"Unexpected error: {str(e)}"
            )

    def is_uv_available(self) -> bool:
        """檢查 uv 是否可用"""
        if self._uv_available is not None:
            return self._uv_available

        result = self._run_uv_command(['--version'], timeout=5)
        self._uv_available = result.success

        if self._uv_available:
            logger.info(f"UV 可用: {result.stdout.strip()}")
        else:
            logger.warning("UV 不可用")

        return self._uv_available

    def get_uv_version(self) -> Optional[str]:
        """取得 uv 版本"""
        if not self.is_uv_available():
            return None

        result = self._run_uv_command(['--version'], timeout=5)
        if result.success:
            # 輸出格式: "uv 0.5.4 (c62c83c37 2024-11-20)"
            parts = result.stdout.strip().split()
            if len(parts) >= 2:
                return parts[1]
        return None

    def create_venv(
        self,
        path: Optional[Path] = None,
        python_version: Optional[str] = None,
        seed: bool = False
    ) -> Tuple[bool, str]:
        """
        建立虛擬環境

        Args:
            path: 虛擬環境路徑，預設為當前目錄的 .venv
            python_version: Python 版本，例如 "3.11"
            seed: 是否安裝 seed 套件 (pip, setuptools, wheel)

        Returns:
            (成功與否, 訊息)
        """
        if not self.is_uv_available():
            return False, "UV is not available. Please install it first."

        venv_path = path or Path.cwd() / '.venv'
        self._venv_path = venv_path

        args = ['venv']

        if python_version:
            args.extend(['--python', python_version])

        if seed:
            args.append('--seed')

        args.append(str(venv_path))

        result = self._run_uv_command(args, timeout=60)

        if result.success:
            logger.info(f"虛擬環境已建立: {venv_path}")
            return True, f"Virtual environment created at {venv_path}"
        else:
            return False, f"Failed to create venv: {result.stderr}"

    def install_package(
        self,
        package: str,
        venv_path: Optional[Path] = None,
        upgrade: bool = False
    ) -> Tuple[bool, str]:
        """
        安裝套件（使用 uv pip install）

        Args:
            package: 套件名稱（可包含版本，如 "numpy==1.24.0"）
            venv_path: 虛擬環境路徑
            upgrade: 是否升級已安裝的套件

        Returns:
            (成功與否, 訊息)
        """
        if not self.is_uv_available():
            return False, "UV is not available"

        args = ['pip', 'install', package]

        if upgrade:
            args.append('--upgrade')

        # 設定環境變數以使用指定的 venv
        env = os.environ.copy()
        target_venv = venv_path or self._venv_path
        if target_venv:
            env['VIRTUAL_ENV'] = str(target_venv)

        result = self._run_uv_command(args, env=env, timeout=300)

        if result.success:
            logger.info(f"套件已安裝: {package}")
            return True, f"Successfully installed {package}"
        else:
            return False, f"Failed to install {package}: {result.stderr}"

    def uninstall_package(
        self,
        package: str,
        venv_path: Optional[Path] = None
    ) -> Tuple[bool, str]:
        """
        移除套件（使用 uv pip uninstall）

        Args:
            package: 套件名稱
            venv_path: 虛擬環境路徑

        Returns:
            (成功與否, 訊息)
        """
        if not self.is_uv_available():
            return False, "UV is not available"

        args = ['pip', 'uninstall', package, '-y']

        env = os.environ.copy()
        target_venv = venv_path or self._venv_path
        if target_venv:
            env['VIRTUAL_ENV'] = str(target_venv)

        result = self._run_uv_command(args, env=env, timeout=60)

        if result.success:
            logger.info(f"套件已移除: {package}")
            return True, f"Successfully uninstalled {package}"
        else:
            return False, f"Failed to uninstall {package}: {result.stderr}"

    def list_installed_packages(
        self,
        venv_path: Optional[Path] = None
    ) -> List[PackageInfo]:
        """
        列出已安裝的套件

        Args:
            venv_path: 虛擬環境路徑

        Returns:
            套件資訊列表
        """
        if not self.is_uv_available():
            return []

        args = ['pip', 'list', '--format', 'json']

        env = os.environ.copy()
        target_venv = venv_path or self._venv_path
        if target_venv:
            env['VIRTUAL_ENV'] = str(target_venv)

        result = self._run_uv_command(args, env=env, timeout=30)

        if result.success:
            try:
                import json
                packages_data = json.loads(result.stdout)
                packages = [
                    PackageInfo(
                        name=pkg.get('name', ''),
                        version=pkg.get('version', ''),
                        location=pkg.get('location')
                    )
                    for pkg in packages_data
                ]
                logger.debug(f"列出 {len(packages)} 個已安裝套件")
                return packages
            except json.JSONDecodeError as e:
                logger.error(f"解析套件列表 JSON 失敗: {e}")
                return []
        return []

    def sync_environment(
        self,
        requirements_file: Optional[Path] = None
    ) -> Tuple[bool, str]:
        """
        同步環境（使用 uv pip sync）

        Args:
            requirements_file: requirements 檔案路徑

        Returns:
            (成功與否, 訊息)
        """
        if not self.is_uv_available():
            return False, "UV is not available"

        args = ['pip', 'sync']

        if requirements_file:
            args.append(str(requirements_file))

        result = self._run_uv_command(args, timeout=300)

        if result.success:
            logger.info("環境同步完成")
            return True, "Environment synchronized successfully"
        else:
            return False, f"Failed to sync environment: {result.stderr}"

    def add_dependency(
        self,
        package: str,
        dev: bool = False
    ) -> Tuple[bool, str]:
        """
        新增依賴到專案（使用 uv add，適用於有 pyproject.toml 的專案）

        Args:
            package: 套件名稱
            dev: 是否為開發依賴

        Returns:
            (成功與否, 訊息)
        """
        if not self.is_uv_available():
            return False, "UV is not available"

        args = ['add', package]

        if dev:
            args.append('--dev')

        result = self._run_uv_command(args, timeout=300)

        if result.success:
            logger.info(f"依賴已新增: {package}")
            return True, f"Successfully added {package} to dependencies"
        else:
            return False, f"Failed to add {package}: {result.stderr}"

    def remove_dependency(
        self,
        package: str,
        dev: bool = False
    ) -> Tuple[bool, str]:
        """
        移除專案依賴（使用 uv remove）

        Args:
            package: 套件名稱
            dev: 是否為開發依賴

        Returns:
            (成功與否, 訊息)
        """
        if not self.is_uv_available():
            return False, "UV is not available"

        args = ['remove', package]

        if dev:
            args.append('--dev')

        result = self._run_uv_command(args, timeout=60)

        if result.success:
            logger.info(f"依賴已移除: {package}")
            return True, f"Successfully removed {package} from dependencies"
        else:
            return False, f"Failed to remove {package}: {result.stderr}"

    def sync_project(self) -> Tuple[bool, str]:
        """
        同步專案依賴（使用 uv sync，適用於有 pyproject.toml 的專案）

        Returns:
            (成功與否, 訊息)
        """
        if not self.is_uv_available():
            return False, "UV is not available"

        result = self._run_uv_command(['sync'], timeout=300)

        if result.success:
            logger.info("專案依賴同步完成")
            return True, "Project dependencies synchronized successfully"
        else:
            return False, f"Failed to sync project: {result.stderr}"

    def get_environment_info(self) -> EnvironmentInfo:
        """取得當前環境資訊"""
        python_version = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"

        # 檢查是否在虛擬環境中
        is_venv = hasattr(sys, 'real_prefix') or (
            hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix
        )

        venv_path = None
        if is_venv:
            venv_path = Path(sys.prefix)

        return EnvironmentInfo(
            python_version=python_version,
            venv_path=venv_path,
            is_venv_active=is_venv,
            uv_version=self.get_uv_version()
        )

    def freeze(self, venv_path: Optional[Path] = None) -> List[str]:
        """
        匯出已安裝套件列表（格式為 package==version）

        Returns:
            套件列表
        """
        packages = self.list_installed_packages(venv_path)
        return [f"{pkg.name}=={pkg.version}" for pkg in packages]

    def check_package_installed(
        self,
        package_name: str,
        venv_path: Optional[Path] = None
    ) -> bool:
        """
        檢查套件是否已安裝

        Args:
            package_name: 套件名稱
            venv_path: 虛擬環境路徑

        Returns:
            是否已安裝
        """
        packages = self.list_installed_packages(venv_path)
        return any(pkg.name.lower() == package_name.lower() for pkg in packages)

    def run_command(
        self,
        command: List[str],
        cwd: Optional[Path] = None
    ) -> Tuple[bool, str]:
        """
        使用 uv run 執行命令（在專案環境中）

        Args:
            command: 要執行的命令
            cwd: 工作目錄

        Returns:
            (成功與否, 輸出)
        """
        if not self.is_uv_available():
            return False, "UV is not available"

        args = ['run'] + command
        result = self._run_uv_command(args, cwd=cwd, timeout=300)

        if result.success:
            return True, result.stdout
        else:
            return False, result.stderr