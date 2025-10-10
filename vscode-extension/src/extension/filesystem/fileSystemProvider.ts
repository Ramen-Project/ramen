import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class RamenFileSystemProvider implements vscode.FileSystemProvider {
    private _onDidChangeFile = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    readonly onDidChangeFile = this._onDidChangeFile.event;

    private watchers = new Map<string, fs.FSWatcher>();

    constructor(private context: vscode.ExtensionContext) {}

    watch(uri: vscode.Uri, options: { recursive: boolean; excludes: string[] }): vscode.Disposable {
        const filePath = uri.fsPath;

        // Skip if already watching
        if (this.watchers.has(filePath)) {
            return new vscode.Disposable(() => {});
        }

        // Only watch .ramen files
        if (!filePath.endsWith('.ramen')) {
            return new vscode.Disposable(() => {});
        }

        try {
            const watcher = fs.watch(filePath, (eventType, filename) => {
                if (eventType === 'change') {
                    this._onDidChangeFile.fire([
                        {
                            type: vscode.FileChangeType.Changed,
                            uri: uri,
                        },
                    ]);
                }
            });

            this.watchers.set(filePath, watcher);

            return new vscode.Disposable(() => {
                watcher.close();
                this.watchers.delete(filePath);
            });
        } catch (error) {
            console.error(`Failed to watch file ${filePath}:`, error);
            return new vscode.Disposable(() => {});
        }
    }

    stat(uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
        return new Promise((resolve, reject) => {
            fs.stat(uri.fsPath, (err, stats) => {
                if (err) {
                    reject(vscode.FileSystemError.FileNotFound(uri));
                    return;
                }

                resolve({
                    type: stats.isDirectory() ? vscode.FileType.Directory : vscode.FileType.File,
                    ctime: stats.ctime.getTime(),
                    mtime: stats.mtime.getTime(),
                    size: stats.size,
                });
            });
        });
    }

    readDirectory(
        uri: vscode.Uri
    ): [string, vscode.FileType][] | Thenable<[string, vscode.FileType][]> {
        return new Promise((resolve, reject) => {
            fs.readdir(uri.fsPath, { withFileTypes: true }, (err, entries) => {
                if (err) {
                    reject(err);
                    return;
                }

                const result: [string, vscode.FileType][] = entries
                    .filter((entry) => entry.isDirectory() || entry.name.endsWith('.ramen'))
                    .map((entry) => {
                        const type = entry.isDirectory()
                            ? vscode.FileType.Directory
                            : vscode.FileType.File;
                        return [entry.name, type];
                    });

                resolve(result);
            });
        });
    }

    createDirectory(uri: vscode.Uri): void | Thenable<void> {
        return new Promise((resolve, reject) => {
            fs.mkdir(uri.fsPath, { recursive: true }, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    readFile(uri: vscode.Uri): Uint8Array | Thenable<Uint8Array> {
        return new Promise((resolve, reject) => {
            fs.readFile(uri.fsPath, (err, data) => {
                if (err) {
                    reject(vscode.FileSystemError.FileNotFound(uri));
                } else {
                    resolve(data);
                }
            });
        });
    }

    writeFile(
        uri: vscode.Uri,
        content: Uint8Array,
        options: { create: boolean; overwrite: boolean }
    ): void | Thenable<void> {
        return new Promise((resolve, reject) => {
            const dirPath = path.dirname(uri.fsPath);

            // Ensure directory exists
            fs.mkdir(dirPath, { recursive: true }, (err) => {
                if (err && err.code !== 'EEXIST') {
                    reject(err);
                    return;
                }

                // Check if file exists
                fs.access(uri.fsPath, fs.constants.F_OK, (err) => {
                    const fileExists = !err;

                    if (fileExists && !options.overwrite) {
                        reject(vscode.FileSystemError.FileExists(uri));
                        return;
                    }

                    if (!fileExists && !options.create) {
                        reject(vscode.FileSystemError.FileNotFound(uri));
                        return;
                    }

                    // Write the file
                    fs.writeFile(uri.fsPath, content, (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            this._onDidChangeFile.fire([
                                {
                                    type: fileExists
                                        ? vscode.FileChangeType.Changed
                                        : vscode.FileChangeType.Created,
                                    uri: uri,
                                },
                            ]);
                            resolve();
                        }
                    });
                });
            });
        });
    }

    delete(uri: vscode.Uri, options: { recursive: boolean }): void | Thenable<void> {
        return new Promise((resolve, reject) => {
            fs.stat(uri.fsPath, (err, stats) => {
                if (err) {
                    reject(vscode.FileSystemError.FileNotFound(uri));
                    return;
                }

                if (stats.isDirectory() && options.recursive) {
                    fs.rm(uri.fsPath, { recursive: true, force: true }, (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            this._onDidChangeFile.fire([
                                {
                                    type: vscode.FileChangeType.Deleted,
                                    uri: uri,
                                },
                            ]);
                            resolve();
                        }
                    });
                } else {
                    fs.unlink(uri.fsPath, (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            this._onDidChangeFile.fire([
                                {
                                    type: vscode.FileChangeType.Deleted,
                                    uri: uri,
                                },
                            ]);
                            resolve();
                        }
                    });
                }
            });
        });
    }

    rename(
        oldUri: vscode.Uri,
        newUri: vscode.Uri,
        options: { overwrite: boolean }
    ): void | Thenable<void> {
        return new Promise((resolve, reject) => {
            // Check if target exists
            fs.access(newUri.fsPath, fs.constants.F_OK, (err) => {
                const targetExists = !err;

                if (targetExists && !options.overwrite) {
                    reject(vscode.FileSystemError.FileExists(newUri));
                    return;
                }

                // Ensure target directory exists
                const targetDir = path.dirname(newUri.fsPath);
                fs.mkdir(targetDir, { recursive: true }, (err) => {
                    if (err && err.code !== 'EEXIST') {
                        reject(err);
                        return;
                    }

                    // Rename the file
                    fs.rename(oldUri.fsPath, newUri.fsPath, (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            this._onDidChangeFile.fire([
                                {
                                    type: vscode.FileChangeType.Deleted,
                                    uri: oldUri,
                                },
                                {
                                    type: vscode.FileChangeType.Created,
                                    uri: newUri,
                                },
                            ]);
                            resolve();
                        }
                    });
                });
            });
        });
    }

    copy?(
        source: vscode.Uri,
        destination: vscode.Uri,
        options: { overwrite: boolean }
    ): void | Thenable<void> {
        return new Promise((resolve, reject) => {
            // Check if destination exists
            fs.access(destination.fsPath, fs.constants.F_OK, (err) => {
                const destExists = !err;

                if (destExists && !options.overwrite) {
                    reject(vscode.FileSystemError.FileExists(destination));
                    return;
                }

                // Ensure destination directory exists
                const destDir = path.dirname(destination.fsPath);
                fs.mkdir(destDir, { recursive: true }, (err) => {
                    if (err && err.code !== 'EEXIST') {
                        reject(err);
                        return;
                    }

                    // Copy the file
                    fs.copyFile(source.fsPath, destination.fsPath, (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            this._onDidChangeFile.fire([
                                {
                                    type: vscode.FileChangeType.Created,
                                    uri: destination,
                                },
                            ]);
                            resolve();
                        }
                    });
                });
            });
        });
    }

    /**
     * Validate a .ramen file's JSON structure
     */
    async validateRamenFile(uri: vscode.Uri): Promise<{ valid: boolean; error?: string }> {
        try {
            const content = await this.readFile(uri);
            const text = Buffer.from(content).toString('utf8');
            const json = JSON.parse(text);

            // Validate required fields
            if (!json.version) {
                return { valid: false, error: 'Missing version field' };
            }

            if (!json.nodes || !Array.isArray(json.nodes)) {
                return { valid: false, error: 'Missing or invalid nodes array' };
            }

            if (!json.edges || !Array.isArray(json.edges)) {
                return { valid: false, error: 'Missing or invalid edges array' };
            }

            return { valid: true };
        } catch (error) {
            return { valid: false, error: String(error) };
        }
    }

    /**
     * Create a new .ramen file with default content
     */
    async createNewRamenFile(uri: vscode.Uri, name: string): Promise<void> {
        const defaultContent = {
            version: '1.0.0',
            name: name,
            description: '',
            nodes: [],
            edges: [],
            variables: {},
            metadata: {
                created: new Date().toISOString(),
                modified: new Date().toISOString(),
                author: vscode.workspace.getConfiguration('ramen').get('author', ''),
            },
        };

        const content = Buffer.from(JSON.stringify(defaultContent, null, 2), 'utf8');
        await this.writeFile(uri, content, { create: true, overwrite: false });
    }

    dispose() {
        // Close all watchers
        this.watchers.forEach((watcher) => watcher.close());
        this.watchers.clear();
        this._onDidChangeFile.dispose();
    }
}
