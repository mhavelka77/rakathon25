package main

import (
    "bufio"
    "fmt"
    "log"
    "os"
    "os/exec"
    "runtime"
    "strings"
    "time"

    // The underscore means we don't import any symbols, but we need this for embedding.
    _ "embed"
)

//go:embed bin/backend.tar
var backendTar []byte

//go:embed bin/frontend.tar
var frontendTar []byte

//go:embed docker-compose.yml
var composeFile []byte

func main() {
    // 1) Prompt for OpenAI API key
    reader := bufio.NewReader(os.Stdin)
    fmt.Print("Please enter your OpenAI API key: ")
    key, err := reader.ReadString('\n')
    if err != nil {
        log.Fatalf("Error reading API key: %v", err)
    }
    key = strings.TrimSpace(key)
    if key == "" {
        fmt.Println("No OpenAI API key entered. Exiting.")
        return
    }

    // 2) Check if Docker is installed and running
    if !isDockerAvailable() {
        fmt.Println("Docker does not seem to be installed or running.")
        fmt.Println("Please install/start Docker and try again.")
        return
    }

    // 3) Write out your embedded .tar files for backend and frontend
    fmt.Println("Loading Docker images from embedded archives...")

    if err := writeFile("backend.tar", backendTar); err != nil {
        log.Fatal(err)
    }
    if err := dockerLoad("backend.tar"); err != nil {
        log.Fatalf("Failed to docker load backend.tar: %v", err)
    }
    // Optionally remove the .tar after loading
    os.Remove("backend.tar")

    if err := writeFile("frontend.tar", frontendTar); err != nil {
        log.Fatal(err)
    }
    if err := dockerLoad("frontend.tar"); err != nil {
        log.Fatalf("Failed to docker load frontend.tar: %v", err)
    }
    // Optionally remove the .tar after loading
    os.Remove("frontend.tar")

    // 4) Write out docker-compose.yaml (embedded) so we can run compose
    if err := writeFile("docker-compose.yml", composeFile); err != nil {
        log.Fatal(err)
    }

    fmt.Println("Docker images loaded. Starting containers...")

    // 5) Run docker compose up -d, injecting the user's API key into the environment
    cmd := exec.Command("docker", "compose", "-f", "docker-compose.yml", "up", "-d")
    // Add OPENAI_API_KEY to the environment of the child process
    cmd.Env = append(os.Environ(), "OPENAI_API_KEY="+key)

    cmd.Stdout = os.Stdout
    cmd.Stderr = os.Stderr
    if err := cmd.Run(); err != nil {
        log.Fatalf("Failed to run docker compose up: %v", err)
    }

    // 6) Optional: wait and open the default browser
    fmt.Println("Containers are starting. Please wait a few seconds...")
    time.Sleep(3 * time.Second)
    openBrowser("http://localhost:8000")
    // Adjust the URL/port as appropriate for your frontend

    fmt.Println("Done! Press Ctrl+C to stop if needed (or run 'docker compose down').")
}

func isDockerAvailable() bool {
    // Just a simple check if `docker ps` works
    cmd := exec.Command("docker", "ps")
    return cmd.Run() == nil
}

func writeFile(filename string, data []byte) error {
    f, err := os.Create(filename)
    if err != nil {
        return err
    }
    defer f.Close()
    _, err = f.Write(data)
    return err
}

func dockerLoad(tarPath string) error {
    cmd := exec.Command("docker", "load", "-i", tarPath)
    cmd.Stdout = os.Stdout
    cmd.Stderr = os.Stderr
    return cmd.Run()
}

func openBrowser(url string) {
    var err error

    switch os := runtime.GOOS; os {
    case "darwin":
        err = exec.Command("open", url).Start()
    case "linux":
        err = exec.Command("xdg-open", url).Start()
    case "windows":
        err = exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
    default:
        fmt.Printf("Unsupported operating system: %s\nPlease open %s manually\n", os, url)
        return
    }

    if err != nil {
        fmt.Printf("Error opening browser: %v\nPlease navigate to %s manually\n", err, url)
    }
}
