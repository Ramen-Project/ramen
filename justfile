default:
    @echo "build - Build the whole application"

build: build-web
    @uv build

build-web:
    @cd src/web && bun install && bun run build
    @cp -R src/web/dist/. artifacts

clean:
    @rm -r dist
    @rm -r artifacts