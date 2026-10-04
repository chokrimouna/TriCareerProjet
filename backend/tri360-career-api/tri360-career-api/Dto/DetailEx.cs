namespace QuizBack.Dto
{
    public class DetaildelaitDto{
        public int IdQuestion { get; set; }

        public int IdExaman { get; set; }
    }
public class DeletedelaitSectionExamanDto{
        public int IdSection { get; set; }

        public int IdExaman { get; set; }
    }
public class PutdelaitSectionExamanDto{
        public int IdSection { get; set; }

        public int IdExaman { get; set; }
        
        public List<int>? QuestionEdited {get ; set ;}
    }
}