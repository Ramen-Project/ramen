default:
    @echo "just build - Build the whole application"
    @echo "just clean - Remove artifacts"

build: build-web
    @uv build --all-packages

build-web:
    @cd src/web && bun install && bun run build
    @cp -R src/web/dist/. artifacts

web-dev:
    @cd src/web && bun run dev

clean:
    @rm -r dist
    @rm -r artifacts