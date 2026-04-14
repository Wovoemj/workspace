# Git 工作流规范与团队协作指南

## 1. 分支策略 (Git Flow 简化版)

### 1.1 分支结构
```
main (受保护) ── develop (主开发分支)
    ├── feature/功能名   (功能分支)
    ├── bugfix/缺陷名   (缺陷修复)
    └── hotfix/紧急修复 (生产环境修复)
```

### 1.2 分支命名规范

#### 功能分支 (feature/)
- `feature/` - 新功能开发
  - 命名: `feature/feat-user-auth-202404`
  - 命名: `feature/bugfix-login-issue`
  
#### 修复分支 (bugfix/)
- `bugfix/` - 生产环境紧急修复
  - 命名: `bugfix/fix-login-issue-001`

#### 热修复 (hotfix/)
- `hotfix/` - 紧急生产环境修复
  - 命名: `hotfix/20240413-紧急登录问题`

#### 发布分支 (release/)
- `release/1.0.0` - 版本发布分支

## 2. 提交信息规范 (Conventional Commits)

### 2.1 提交类型
```
feat:     新功能
fix:      修复bug
docs:     文档更新
style:    代码格式调整
refactor: 重构代码
test:     测试相关
chore:    构建过程或辅助工具的变动
```

### 2.2 提交信息格式
```
<type>(<scope>): <subject>

<body>
[optional footer]

示例:
feat(auth): 添加用户登录功能

- 实现JWT认证
- 添加登录表单验证
- 增加记住登录功能

Closes #123
```

## 3. 工作流程

### 3.1 新功能开发流程
1. 从develop分支创建功能分支
   ```bash
   git checkout develop
   git checkout -b feature/user-auth
   ```

2. 开发过程中保持小步提交
   ```bash
   git add .
   git commit -m "feat(auth): 添加用户登录界面"
   ```

3. 功能完成后推送到远程
   ```bash
   git push origin feature/user-auth
   ```

4. 创建Pull Request
   - 在GitHub/GitLab创建PR
   - 请求1-2名同事Review
   - 通过CI/CD检查
   - 合并到develop分支

## 4. 代码审查流程

### 4.1 审查清单
- [ ] 代码符合编码规范
- [ ] 有相应的单元测试
- [ ] 文档已更新
- [ ] 没有引入安全漏洞
- [ ] 性能影响评估

### 4.2 审查意见
- 使用GitHub/GitLab的Review功能
- 评论要具体，提供修改建议
- 使用`+1`、`-1`投票系统

## 5. 分支保护规则

### 5.1 受保护分支
- `main` - 生产环境分支
- `develop` - 开发分支

### 5.2 保护规则
- 禁止直接push到受保护分支
- 必须通过Pull Request
- 必须通过CI/CD流水线
- 必须至少1人Review

## 6. Git Hooks配置

### 6.1 客户端Hook（.git/hooks）
1. pre-commit: 代码格式检查
2. pre-push: 运行测试套件
3. commit-msg: 验证提交信息格式

### 6.2 服务端Hook（可选）
配置在Git服务器端执行代码质量检查

## 7. CI/CD集成

### 7.1 自动检查项
- 代码风格检查 (ESLint, Pylint)
- 单元测试覆盖率
- 构建检查
- 安全漏洞扫描

### 7.2 自动化部署
- develop分支自动部署到测试环境
- main分支自动部署到生产环境（手动触发）

## 8. Git配置建议

### 8.1 全局配置
```bash
git config --global user.name "Your Name"
git config --global user.email "email@example.com"
git config --global init.defaultBranch main
```

### 8.2 别名配置
```bash
# .gitconfig
[alias]
    co = checkout
    br = branch
    ci = commit
    st = status
    lg = log --graph --oneline --decorate --format=format:'%C(bold blue)%h%C(reset) - %C(white)%s%C(reset) %C(dim green)(%ar) [%an]%C(reset)'
```

## 9. 常见工作流

### 9.1 日常开发流程
1. `git checkout develop`
2. `git pull origin develop`
3. `git checkout -b feature/my-feature`
4. 开发并提交
5. `git push origin feature/my-feature`
6. 创建Pull Request

### 9.2 紧急修复流程
1. `git checkout -b hotfix/issue-description main`
2. 修复问题并提交
3. 创建Hotfix PR
4. 快速Review和合并

## 10. 最佳实践

### 10.1 提交规范
- 一次提交一个功能
- 提交信息清晰明确
- 遵循Conventional Commits规范

### 10.2 分支管理
- 定期清理已合并的分支
- 使用rebase保持分支干净
- 定期同步develop分支

### 10.3 冲突解决
- 优先使用git merge --no-ff保持历史清晰
- 小步提交，减少冲突
- 使用rebase整理提交历史（仅限本地分支）

## 11. 工具推荐

### 可视化工具
- GitKraken
- SourceTree
- GitHub Desktop

### 命令行工具
- tig (终端Git浏览器)
- delta (更好的diff查看)
- diff-so-fancy (美化diff输出)

## 12. 团队协作规则

### 12.1 每日工作流
1. 开始工作：`git status` 查看状态
2. 同步最新代码：`git fetch origin`
3. 创建/切换分支
4. 开发、测试、提交
5. 定期推送：`git push origin 分支名`

### 12.2 代码审查
- 小步提交，小步Review
- 审查意见24小时内回复
- 使用"建议修改"功能
- 使用表情符号快速反馈（👍 👀 ❤️）

## 13. 紧急情况处理

### 13.1 回滚错误提交
```bash
# 回滚到指定提交
git revert <commit-hash>

# 或者使用reset（谨慎使用）
git reset --hard <commit-hash>
```

### 13.2 恢复误删分支
```bash
# 查看最近删除的分支
git reflog

# 恢复分支
git checkout -b feature/restored <commit-hash>
```

---

*本文档应根据团队实际情况调整，定期回顾和更新。*

**版本**: v1.0.0  
**最后更新**: 2024-04-13  
**维护者**: 团队技术负责人