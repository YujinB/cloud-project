# 2025 CloudComputing_Project  

<br>

## AWS Load Balancing & Auto Scaling Dashboard  
(React + Node.js + RDS + S3)

본 프로젝트는 AWS 환경에서 **트래픽 부하 발생에 따라 자동으로 서버를 확장/축소**하며,  
그 결과를 **실시간 대시보드로 시각화**한 시스템입니다. 

<br>

## 🛠 AWS Architecture Stack
| Service | Role |
|--------|------|
| **EC2 Auto Scaling Group** | 트래픽 부하 기반 서버 증설/감소 |
| **Application Load Balancer** | 트래픽 분산 및 Health Check |
| **RDS (MySQL)** | 방문 로그 / 메모 기록 저장 |
| **S3 (Static Image)** | 샘플 이미지 저장 및 UI 표시 |
| **IAM Role** | 서버에서 S3/RDS 인증 키 없이 권한 접근 |

<br>

## ✨ Core Features (Dashboard)
| Feature | Description |
|--------|------------|
| **트래픽 발생 및 서버별 카운트** | 방문 요청을 주기적으로 발생시키며 서버별 할당 확인 |
| **AutoScaling 인스턴스 감지** | 최근 10분 접속 서버 수 실시간 집계 |
| **이미지 기록(S3) 표시** | DB와 연동하여 업로드 이미지 목록 UI 확인 |
| **메모 저장/조회 기능** | 사용자 입력 메모 저장 및 테이블 표시 |
| **최근 요청 로그 확인** | 시간 / 서버 / 경로 / 카운트 기록 |

<br>

## 📌 Project Purpose
- 단일 서버 트래픽 대응 한계 검증
- 확장형 아키텍처의 필요성 확인
- 무중단 배포 및 운영 가능성 실험
- 비용 효율 기반 서버 운영 전략 학습

<br>

## 📺 Dashboard Demo (Screenshots)
<img width="500" alt="image" src="https://github.com/user-attachments/assets/e26a1fa3-3e20-4e94-ab8b-25192939b97f" />
<img width="500" alt="image" src="https://github.com/user-attachments/assets/c2f87045-c11a-42a4-bfb2-05e4a9e86008" />

<br>

## ⚡ Operational Benefits & Scaling Strategy

- 부하 증가 시 자동 확장하여 서비스 지속 가능성 확보
- 사용량 감소 시 서버 축소로 비용 효율 향상
- ALB Health Check 를 통해 장애 인스턴스 자동 제거
- 관리자가 직접 수동 대응하지 않아도 되는 운영 구조

본 구조는 단일 EC2에서 발생할 수 있는 장애·성능 저하·트래픽 폭주 문제를 해결하며  
AWS 기반 구조가 단일 서버 대비 **확장성, 복구 능력, 운영 효율성** 측면에서 유리하다는 점을 확인했습니다.

<br>

## 🧱 Tech Stack
- **Frontend** : React + Vite
- **Backend** : Node.js Express
- **Database** : MySQL (AWS RDS)
- **Cloud Infra** : ALB + Auto Scaling + Security Group
- **Deployment** : EC2 + PM2
