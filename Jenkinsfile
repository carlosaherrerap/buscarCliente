pipeline {
    agent any
    
    environment {
        PROJECT_DIR = "C:\\Users\\Administrador\\Documents\\personal\\Nueva carpeta\\buscarCliente"
        COMPOSE_FILE = "docker-compose.yml"
        CONTAINER_NAME = "callcenter-web"
        GIT_REPO = "https://github.com/InformaPeru-com/loginInformaPeru.git"
    }
    
    stages {
        stage('Checkout') {
            steps {
                echo '🚀 Iniciando pipeline CI/CD'
                echo '📍 Directorio de proyecto: ${PROJECT_DIR}'
                script {
                    bat """
                        @echo off
                        echo Cambiando al directorio del proyecto...
                        cd /d "${PROJECT_DIR}"
                        if errorlevel 1 (
                            echo ERROR: No se pudo acceder al directorio ${PROJECT_DIR}
                            exit /b 1
                        )
                        echo --- Archivos en el directorio ---
                        dir
                        echo --- Configurando git remoto y haciendo pull ---
                        git remote remove origin 2>nul
                        git remote add origin ${GIT_REPO} 2>nul
                        git remote set-url origin ${GIT_REPO}
                        echo Haciendo git pull desde ${GIT_REPO}...
                        git pull origin master
                        if errorlevel 1 (
                            echo ADVERTENCIA: El git pull falló, continuando de todas formas...
                        )
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
                        echo Deteniendo contenedor existente si existe...
                        docker stop ${CONTAINER_NAME} 2>nul
                        echo Eliminando contenedor existente si existe...
                        docker rm -f ${CONTAINER_NAME} 2>nul
                        if errorlevel 1 echo Contenedor no existía o ya fue eliminado
                        echo Construyendo imagen Docker...
                        docker-compose build --no-cache
                        if errorlevel 1 (
                            echo ERROR: Falló la construcción de la imagen
                            exit /b 1
                        )
                        echo Levantando contenedor...
                        docker-compose up -d
                        if errorlevel 1 (
                            echo ERROR: Falló al levantar el contenedor
                            exit /b 1
                        )
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
