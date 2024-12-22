---
layout: page
title: File Index
---

{% for file in site.static_files %}
  {% assign file_path_without_ext = file.path | split: '.' | first %}
  <a href="{{ file_path_without_ext }}">{{ file_path_without_ext }}</a>
{% endfor %}
