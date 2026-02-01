# Kubernetes 部署

## 使用 Kustomize 部署

```bash
# 开发环境
kubectl apply -k k8s/base

# 生产环境
kubectl apply -k k8s/overlays/production
```

## 查看状态

```bash
kubectl get pods -n openchat
kubectl get svc -n openchat
```

## 查看日志

```bash
kubectl logs -f deployment/openchat-server -n openchat
```
