pipeline {
    agent any
    
    environment {
        PROJECT_DIR = "${WORKSPACE}"
        COMPOSE_FILE = "docker-compose.yml"
        CONTAINER_NAME = "callcenter-web"
    }
    
    stages {
        stage('Checkout') {
            steps {
                echo '🚀 Iniciando pipeline CI/CD'
                echo '📍 Directorio de trabajo: ${WORKSPACE}'
                script {
                    bat """
                        @echo off
                        cd /d "${WORKSPACE}"
                        echo --- Archivos en el workspace ---
                        dir
                        echo --- Verificando Jenkinsfile ---
                        if exist Jenkinsfile (echo Jenkinsfile encontrado) else (echo Jenkinsfile NO encontrado)
                    """
                }
            }
        }
        
        stage('Verificar Docker') {
            steps {
                script {
                    echo 'Verificando que Docker esté disponible...'
                    bat 'docker --version'
                    bat 'docker-compose --version'
                }
            }
        }
        
        stage('Desplegar') {
            steps {
                script {
                    echo '🔄 Desplegando aplicación...'
                    bat """
                        @echo off
                        cd /d "${PROJECT_DIR}"
                        docker stop ${CONTAINER_NAME} 2>nul
                        if errorlevel 1 echo Contenedor no existe o ya estaba detenido
                        docker-compose build --no-cache
                        docker-compose up -d
                    """
                }
            }
        }
        
        stage('Verificar despliegue') {
            steps {
                script {
                    echo 'Verificando que el contenedor esté corriendo...'
                    sleep(time: 5, unit: 'SECONDS')
                    bat """
                        @echo off
                        docker ps --filter name=${CONTAINER_NAME} --format "{{.Names}} - {{.Status}}"
                    """
                    
                    // Verificar logs para asegurar que no hay errores críticos
                    bat """
                        @echo off
                        docker logs --tail 50 ${CONTAINER_NAME}
                        if errorlevel 1 echo No se pudieron obtener los logs
                    """
                }
            }
        }
        
        stage('Limpiar') {
            steps {
                script {
                    echo 'Limpiando imágenes Docker huérfanas...'
                    bat """
                        @echo off
                        docker image prune -f
                        if errorlevel 1 echo No hay imágenes para limpiar
                    """
                }
            }
        }
    }
    
    post {
        success {
            echo '✅ Despliegue exitoso!'
            // Opcional: Enviar notificación (email, Slack, etc.)
        }
        failure {
            echo '❌ Error en el despliegue'
            // Opcional: Enviar notificación de error
        }
        always {
            echo 'Pipeline finalizado'
        }
    }
}
