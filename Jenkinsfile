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
                    // Si ya tenemos el código del SCM, solo verificamos
                    sh """
                        pwd
                        echo '--- Archivos en el workspace ---'
                        ls -la
                        echo '--- Verificando Jenkinsfile ---'
                        test -f Jenkinsfile && echo 'Jenkinsfile encontrado' || echo 'Jenkinsfile NO encontrado'
                    """
                }
            }
        }
        
        stage('Verificar Docker') {
            steps {
                script {
                    echo 'Verificando que Docker esté disponible...'
                    sh 'docker --version'
                    sh 'docker-compose --version'
                }
            }
        }
        
        stage('Verificar si es primera vez') {
            steps {
                script {
                    echo 'Verificando si el contenedor existe...'
                    def containerExists = sh(
                        script: "docker ps -a --filter name=${CONTAINER_NAME} --format '{{.Names}}'",
                        returnStdout: true
                    ).trim()
                    
                    env.IS_FIRST_TIME = containerExists == '' ? 'true' : 'false'
                    echo "¿Es primera vez? ${env.IS_FIRST_TIME}"
                }
            }
        }
        
        stage('Desplegar') {
            steps {
                script {
                    echo '🔄 Desplegando aplicación...'
                    sh """
                        cd ${PROJECT_DIR}
                        docker stop ${CONTAINER_NAME} || true
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
                    sh """
                        docker ps --filter name=${CONTAINER_NAME} --format '{{.Names}} - {{.Status}}'
                    """
                    
                    // Verificar logs para asegurar que no hay errores críticos
                    sh """
                        docker logs --tail 50 ${CONTAINER_NAME} || true
                    """
                }
            }
        }
        
        stage('Limpiar') {
            steps {
                script {
                    echo 'Limpiando imágenes Docker huérfanas...'
                    sh 'docker image prune -f || true'
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

