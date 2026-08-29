"""Windows 控制台的 UTF-8 处理。

这批文件名全是中文，Windows 控制台默认 GBK 代码页会把输出打成乱码，
甚至在 print 路径名时直接抛 UnicodeEncodeError。所有入口都先调 setup()。
（这也是本项目不用 OpenCV 的同类原因：cv2.imread 接受 char*，
中文路径直接读不到。Pillow 对 unicode 路径没问题。）
"""

from __future__ import annotations

import sys


def setup() -> None:
    """把 stdout/stderr 切到 UTF-8，失败则退回替换字符而不是崩掉。"""
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, 'reconfigure', None)
        if reconfigure is None:
            continue
        try:
            reconfigure(encoding='utf-8', errors='replace')
        except (ValueError, OSError):
            pass
