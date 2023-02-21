# frozen_string_literal: true

class TopicOpAdminStatus < ActiveRecord::Base
  self.table_name = "topic_op_admin_status"

  def self.getRecord?(id)
    ret = self.find_by(id:)
    unless ret
      self.updateRecord(id)
    end
    ret = self.find_by(id:)
  end

  def self.updateRecord(id, **new_status)
    if self.exists?(id:)
      self.find_by(id:).update!(**new_status)
    else
      self.create(id: id, **new_status)
    end
  end
end
