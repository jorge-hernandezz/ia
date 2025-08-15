# Docker AI Chat Interface

Una interfaz web moderna tipo ChatGPT para interactuar con la API de Docker AI Model Runner.

## 🚀 Características

- **Interfaz moderna**: Diseño limpio y responsive similar a ChatGPT
- **Integración completa**: Compatible con Docker AI Model Runner API
- **Historial persistente**: Las conversaciones se guardan en localStorage
- **Soporte para Markdown**: Renderizado completo de respuestas con código
- **Tema oscuro/claro**: Cambio automático según preferencias del sistema
- **Responsive**: Funciona perfectamente en desktop y móvil
- **Syntax Highlighting**: Resaltado de código en múltiples lenguajes

## 📋 Requisitos

1. **Docker Desktop** con AI Model Runner habilitado
2. **Modelo AI** descargado y ejecutándose (ej: llama3.2, mistral, codellama)
3. **Navegador web** moderno con soporte para ES6+

## 🛠️ Instalación

1. **Clonar o descargar** los archivos del proyecto
2. **Abrir** `index.html` directamente en tu navegador
3. **Configurar** el endpoint de la API (por defecto: `http://localhost:11434`)

No se requiere servidor web ni instalación adicional.

## ⚙️ Configuración

### Docker AI Model Runner

1. Asegúrate de tener Docker Desktop instalado
2. Habilita el AI Model Runner en Docker Desktop
3. Descarga un modelo compatible:
   ```bash
   docker run --rm -it ollama/ollama pull llama3.2