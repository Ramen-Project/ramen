"""
Serialization utilities
序列化/反序列化工具
"""

import re
from typing import Any, Dict, List, Union


def to_camel_case(snake_str: str) -> str:
    """
    將 snake_case 轉換為 camelCase

    Args:
        snake_str: snake_case 字符串

    Returns:
        camelCase 字符串
    """
    components = snake_str.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])


def to_snake_case(camel_str: str) -> str:
    """
    將 camelCase 轉換為 snake_case

    Args:
        camel_str: camelCase 字符串

    Returns:
        snake_case 字符串
    """
    # 在大寫字母前插入下劃線
    snake = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', camel_str)
    # 處理連續的大寫字母
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', snake).lower()


def _convert_keys(data: Any, converter: callable) -> Any:
    """
    遞迴轉換字典鍵名

    Args:
        data: 要轉換的資料
        converter: 轉換函數

    Returns:
        轉換後的資料
    """
    if isinstance(data, dict):
        return {
            converter(key): _convert_keys(value, converter)
            for key, value in data.items()
        }
    elif isinstance(data, list):
        return [_convert_keys(item, converter) for item in data]
    else:
        return data


def serialize_to_dict(obj: Any, use_camel_case: bool = True) -> Dict[str, Any]:
    """
    將 Pydantic 模型序列化為字典（支援 camelCase 轉換）

    Args:
        obj: Pydantic 模型實例
        use_camel_case: 是否轉換為 camelCase（預設 True，用於前端）

    Returns:
        序列化後的字典
    """
    if hasattr(obj, 'model_dump'):
        # Pydantic v2
        data = obj.model_dump()
    elif hasattr(obj, 'dict'):
        # Pydantic v1
        data = obj.dict()
    else:
        # 普通字典
        data = obj if isinstance(obj, dict) else dict(obj)

    if use_camel_case:
        return _convert_keys(data, to_camel_case)
    return data


def deserialize_from_dict(
    data: Dict[str, Any],
    model_class: type,
    from_camel_case: bool = True
) -> Any:
    """
    從字典反序列化為 Pydantic 模型（支援 camelCase 轉換）

    Args:
        data: 字典資料
        model_class: Pydantic 模型類別
        from_camel_case: 資料是否為 camelCase（預設 True，來自前端）

    Returns:
        Pydantic 模型實例
    """
    if from_camel_case:
        data = _convert_keys(data, to_snake_case)

    return model_class(**data)


def serialize_list(
    items: List[Any],
    use_camel_case: bool = True
) -> List[Dict[str, Any]]:
    """
    序列化 Pydantic 模型列表

    Args:
        items: Pydantic 模型列表
        use_camel_case: 是否轉換為 camelCase

    Returns:
        字典列表
    """
    return [serialize_to_dict(item, use_camel_case) for item in items]


def deserialize_list(
    data_list: List[Dict[str, Any]],
    model_class: type,
    from_camel_case: bool = True
) -> List[Any]:
    """
    反序列化字典列表為 Pydantic 模型列表

    Args:
        data_list: 字典列表
        model_class: Pydantic 模型類別
        from_camel_case: 資料是否為 camelCase

    Returns:
        Pydantic 模型列表
    """
    return [
        deserialize_from_dict(data, model_class, from_camel_case)
        for data in data_list
    ]
