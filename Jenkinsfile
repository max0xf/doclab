@Library(['ci-pipeline-helper@master', 'sonarqube-pipeline-helper@master']) _

pipeline {
    agent {
        label 'ci-nix'
    }
    stages {
        stage('CI') {
            steps {
                script {
                    commonHelper.prepareEnvironment()
                }
                sh 'make -B ci'
            }
            post {
                success {
                    script {
                        helper.checkCoverage()
                    }
                }
            }
        }
    }
    post {
        success {
            archiveArtifacts artifacts: 'coverage/lcov.info', allowEmptyArchive: true
        }
    }
}
