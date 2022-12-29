'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class question extends Model {
    
    static getQuestions(elecId){
      return this.findAll({
        where:{
          elecId,
        },
        order:[["id","ASC"]]
      })
    }

    static countQuestions(elecId){
      return this.count({
        where:{
          elecId,
        }
      })
    }

    static addQuestions({questionName,desc,elecId}){
      return this.create({
        questionName,
        desc,
        elecId,
      })
    }

    static deleteQuestion(id){
      return this.destroy({
        where:{
          id,
        }
      })
    }

    static editQuestion(questionName,desc,elecId){
      return this.update({
        questionName:questionName,
        desc: desc,
      })
    }

    static associate(models) {
      // define association here
      question.belongsTo(models.election,{
        foreignKey: "elecId"
      })
    }
  }
  question.init({
    questionName: DataTypes.STRING,
    desc: DataTypes.STRING,
    elecId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'question',
  });
  return question;
};