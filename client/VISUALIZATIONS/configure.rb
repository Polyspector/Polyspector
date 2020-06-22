#!/usr/bin/env ruby
require "json"

begin
  p "Start :: config.json updating..."
  homeDir = File.expand_path(__FILE__).sub("configure.rb","")
  # Backup
  p "Backup :: config.json -> config_backup.json"
  `cp "#{homeDir}config.json" "#{homeDir}config_backup.json" `
  targetDir = Dir.glob("#{homeDir}**/*").select{|fn|
    (File.directory?(fn) && fn != "#{homeDir}util" && File.exist?("#{fn}/main.js"))
  }
  json = Hash.new
  targetDir.each{|fullPathDir|
    fullPathDir
    dir = fullPathDir.sub("#{homeDir}","")
    if(!dir.include?("/"))then
      json[dir] = Hash.new
      json[dir]["type"] = dir
      json[dir]["path"] = dir
    elsif(dir.split("/").size == 2)then
      data = dir.split("/")
      category = data[0]
      type     = data[1]
      if(!json.keys.include?(category))then
        json[category] = Array.new
      end
      tmp = Hash.new
      tmp["type"] = type
      tmp["path"] = dir
      json[category].push(tmp)
    else
      p "[Warning] Unsupported #{dir}"
    end
  }

  File.open("#{homeDir}config.json","w"){|f|
    f.write(JSON.pretty_generate(json))
  }

  p "Finish :: config.json updating..."
end
