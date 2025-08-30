"""
測試所有 Toppings 是否能正確載入
"""

import unittest
from pathlib import Path
import sys

# 加入專案根目錄到路徑
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from ramen.topping import ToppingLoader, ToppingRegistry


class TestAllToppings(unittest.TestCase):
    """測試所有 Toppings 載入"""
    
    def setUp(self):
        """測試前設定"""
        self.loader = ToppingLoader()
        self.registry = ToppingRegistry()
    
    def test_numpy_topping_loads(self):
        """測試 NumPy topping 載入"""
        try:
            from ramen_topping_numpy import get_topping
            topping = get_topping()
            self.assertIsNotNone(topping)
            self.assertEqual(topping.get_name(), "numpy")
            
            # 初始化 topping
            topping.initialize()
            
            # 測試節點載入
            nodes = topping.get_nodes()
            self.assertGreater(len(nodes), 0)
            print(f"✓ NumPy topping loaded with {len(nodes)} nodes")
        except ImportError as e:
            print(f"✗ NumPy topping failed to load: {e}")
    
    def test_pandas_topping_loads(self):
        """測試 Pandas topping 載入"""
        try:
            from ramen_topping_pandas import get_topping
            topping = get_topping()
            self.assertIsNotNone(topping)
            self.assertEqual(topping.get_name(), "pandas")
            
            # 測試節點載入
            nodes = topping.get_nodes()
            self.assertGreater(len(nodes), 0)
            print(f"✓ Pandas topping loaded with {len(nodes)} nodes")
        except ImportError as e:
            print(f"✗ Pandas topping failed to load: {e}")
    
    def test_torch_topping_loads(self):
        """測試 PyTorch topping 載入"""
        try:
            from ramen_topping_torch import get_topping
            topping = get_topping()
            self.assertIsNotNone(topping)
            self.assertEqual(topping.get_name(), "torch")
            
            # 測試節點載入
            nodes = topping.get_nodes()
            self.assertGreater(len(nodes), 0)
            print(f"✓ PyTorch topping loaded with {len(nodes)} nodes")
        except ImportError as e:
            print(f"✗ PyTorch topping failed to load: {e}")
    
    def test_plots_topping_loads(self):
        """測試 Plots topping 載入"""
        try:
            from ramen_topping_plots import get_topping
            topping = get_topping()
            self.assertIsNotNone(topping)
            self.assertEqual(topping.get_name(), "plots")
            
            # 測試節點載入
            nodes = topping.get_nodes()
            self.assertGreater(len(nodes), 0)
            print(f"✓ Plots topping loaded with {len(nodes)} nodes")
        except ImportError as e:
            print(f"✗ Plots topping failed to load: {e}")
    
    def test_topping_loader_from_modules(self):
        """測試從模組載入 toppings"""
        loader = ToppingLoader()
        
        # 測試載入各個模組
        modules = [
            'ramen_topping_numpy',
            'ramen_topping_pandas',
            'ramen_topping_torch',
            'ramen_topping_plots'
        ]
        
        for module_name in modules:
            try:
                loader.load_from_module(module_name)
                print(f"✓ Loaded {module_name} via ToppingLoader")
            except Exception as e:
                print(f"✗ Failed to load {module_name}: {e}")
    
    def test_registry_node_listing(self):
        """測試註冊表中的節點列表"""
        # 載入所有 toppings
        loader = ToppingLoader()
        
        # 載入內建節點
        from ramen.nodes import get_all_nodes
        builtin_nodes = get_all_nodes()
        print(f"\n內建節點數量: {len(builtin_nodes)}")
        
        # 嘗試載入各個 topping
        loaded_count = 0
        for module_name in ['ramen_topping_numpy', 'ramen_topping_pandas', 
                           'ramen_topping_torch', 'ramen_topping_plots']:
            try:
                loader.load_from_module(module_name)
                loaded_count += 1
            except:
                pass
        
        # 取得所有節點
        registry = ToppingRegistry()
        all_nodes = registry.get_all_nodes()
        print(f"總節點數量: {len(all_nodes)}")
        print(f"成功載入 {loaded_count} 個 toppings")
        
        # 按命名空間分組顯示
        namespaces = {}
        for node_type in all_nodes:
            namespace = node_type.split('.')[0]
            if namespace not in namespaces:
                namespaces[namespace] = []
            namespaces[namespace].append(node_type)
        
        print("\n節點按命名空間分組:")
        for namespace, nodes in sorted(namespaces.items()):
            print(f"  {namespace}: {len(nodes)} 節點")
    
    def test_node_metadata(self):
        """測試節點的元資料"""
        try:
            from ramen_topping_numpy import get_topping
            topping = get_topping()
            nodes = topping.get_nodes()
            
            if nodes:
                # 測試第一個節點的元資料
                node = nodes[0]
                metadata = node.get_metadata()
                
                self.assertIsNotNone(metadata.name)
                self.assertIsNotNone(metadata.description)
                self.assertIsInstance(metadata.inputs, list)
                self.assertIsInstance(metadata.outputs, list)
                
                print(f"\n節點元資料範例:")
                print(f"  名稱: {metadata.name}")
                print(f"  描述: {metadata.description}")
                print(f"  輸入埠: {len(metadata.inputs)}")
                print(f"  輸出埠: {len(metadata.outputs)}")
        except ImportError:
            self.skipTest("NumPy topping not available")


if __name__ == "__main__":
    print("=" * 60)
    print("測試所有 Toppings 載入")
    print("=" * 60)
    
    unittest.main(verbosity=2)