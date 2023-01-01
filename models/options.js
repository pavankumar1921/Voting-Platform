'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class options extends Model {
    static addingOption({optionName,questionId}){
      return this.create({
        optionName,
        questionId
      })
    }
    static deleteOption(id){
      return this.destroy({
        where:{
          id
        }
      })
    }
    static getOptions(questionId){
      return this.findAll({
        where:{
          questionId,
        },
        order:[["id","ASC"]]
      })
    }
    static getOption(id){
      return this.findOne({
        where:{
          id,
        }
      })
    }
    static editOption(newOption,id){
      return this.update({
        optionName:newOption,
      },{
        where:{
          id:id,
        }
      })
    }
    static associate(models) {
      options.belongsTo(models.question,{
        foreignKey:"questionId",
        onDelete:"CASCADE"
      })
    }
  }
  options.init({
    optionName: DataTypes.STRING,
    questionId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'options',
  });
  return options;
};