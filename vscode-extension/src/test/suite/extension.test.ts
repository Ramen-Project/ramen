import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Ramen Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('ramen.ramen-vscode'));
    });

    test('Should activate', async () => {
        const extension = vscode.extensions.getExtension('ramen.ramen-vscode');
        if (extension) {
            await extension.activate();
            assert.ok(extension.isActive);
        }
    });

    test('Should register ramen language', () => {
        const languages = vscode.languages.getLanguages();
        return languages.then((langs) => {
            assert.ok(langs.includes('ramen'));
        });
    });

    test('Commands should be registered', async () => {
        const commands = await vscode.commands.getCommands();
        
        const expectedCommands = [
            'ramen.openGraphEditor',
            'ramen.createNewGraph',
            'ramen.executeGraph',
            'ramen.manageProjectDependencies',
            'ramen.stopServer',
            'ramen.restartServer'
        ];

        expectedCommands.forEach(cmd => {
            assert.ok(commands.includes(cmd), `Command ${cmd} should be registered`);
        });
    });
});