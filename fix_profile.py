import subprocess

# Get the original file
result = subprocess.run(['git', 'cat-file', '-p', 'HEAD:frontend/user-web/src/app/profile/page.tsx'], 
    capture_output=True, cwd='d:/travel-assistant')
content = result.stdout.decode('utf-8', errors='replace')

# Fix the corrupted strings
content = content.replace("toast.success('已退出登?')", "toast.success('已退出登录')")
content = content.replace("|| '?", "|| '?'")
content = content.replace("'普通会?", "'普通会员'")
content = content.replace('min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100', 'min-h-screen page-bg')

# Write back
with open('d:/travel-assistant/frontend/user-web/src/app/profile/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('File fixed')
lines = content.split('\n')
print('Line 262:', repr(lines[261]))
print('Line 271:', repr(lines[270]))
